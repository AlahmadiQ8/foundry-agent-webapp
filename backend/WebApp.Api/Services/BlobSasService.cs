using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace WebApp.Api.Services;

/// <summary>
/// Service for generating user delegation SAS tokens for Azure Blob Storage URIs.
/// Uses Microsoft Entra ID credentials for secure, time-limited access.
/// </summary>
public class BlobSasService : IDisposable
{
    private readonly ILogger<BlobSasService> _logger;
    private readonly BlobServiceClient? _blobServiceClient;
    private readonly string? _storageAccountName;
    private readonly TimeSpan _sasTokenDuration;
    private readonly bool _isEnabled;
    private bool _disposed = false;

    public BlobSasService(
        IConfiguration configuration,
        ILogger<BlobSasService> logger)
    {
        _logger = logger;
        
        // Get storage account configuration
        _storageAccountName = configuration["STORAGE_ACCOUNT_NAME"];
        
        if (string.IsNullOrEmpty(_storageAccountName))
        {
            _logger.LogWarning("STORAGE_ACCOUNT_NAME not configured. SAS token generation will be disabled.");
            _isEnabled = false;
            return;
        }

        // Parse SAS token duration (default to 1 hour)
        var durationMinutes = configuration.GetValue<int?>("SAS_TOKEN_DURATION_MINUTES") ?? 60;
        _sasTokenDuration = TimeSpan.FromMinutes(durationMinutes);

        try
        {
            // Construct blob endpoint
            var endpoint = $"https://{_storageAccountName}.blob.core.windows.net";
            
            // Use same credential strategy as AzureAIAgentService
            TokenCredential credential;
            var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";
            
            if (environment == "Development")
            {
                _logger.LogInformation("Development environment: Using ChainedTokenCredential for Blob Storage");
                credential = new ChainedTokenCredential(
                    new AzureCliCredential(),
                    new AzureDeveloperCliCredential()
                );
                
                _logger.LogInformation("ChainedTokenCredential will try: AzureCliCredential → AzureDeveloperCliCredential");
            }
            else
            {
                _logger.LogInformation("Production environment: Using ManagedIdentityCredential for Blob Storage");
                credential = new ManagedIdentityCredential();
            }

            _logger.LogInformation("Initializing BlobServiceClient for endpoint: {Endpoint}", endpoint);
            _blobServiceClient = new BlobServiceClient(new Uri(endpoint), credential);
            
            // Test authentication and verify permissions
            try
            {
                var accountInfo = _blobServiceClient.GetAccountInfo();
                _logger.LogInformation("Successfully authenticated to storage account: {StorageAccount}", _storageAccountName);
                
                // Verify Storage Blob Delegator role by testing user delegation key generation
                try
                {
                    var testKey = _blobServiceClient.GetUserDelegationKey(
                        startsOn: DateTimeOffset.UtcNow,
                        expiresOn: DateTimeOffset.UtcNow.AddMinutes(1));
                    
                    _logger.LogInformation("Verified Storage Blob Delegator permissions (Signed OID: {SignedOid})", 
                        testKey.Value.SignedObjectId);
                }
                catch (RequestFailedException keyEx) when (keyEx.Status == 403)
                {
                    _logger.LogError(
                        "Missing 'Storage Blob Delegator' role. SAS token generation will fail. " +
                        "Error: {ErrorCode} - {Message}",
                        keyEx.ErrorCode, keyEx.Message);
                }
            }
            catch (RequestFailedException authEx)
            {
                _logger.LogError(authEx,
                    "Failed to authenticate to storage account. Status: {Status}, Error: {ErrorCode}",
                    authEx.Status, authEx.ErrorCode);
            }
            
            _isEnabled = true;
            
            _logger.LogInformation(
                "BlobSasService initialized for storage account: {StorageAccount}, SAS duration: {Duration} minutes",
                _storageAccountName,
                durationMinutes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize BlobServiceClient. SAS token generation will be disabled.");
            _isEnabled = false;
        }
    }

    /// <summary>
    /// Appends a user delegation SAS token to a blob URI if the URI is from the configured storage account.
    /// Returns the original URI if SAS generation is disabled or fails.
    /// </summary>
    /// <param name="blobUri">The blob URI to append SAS token to</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>URI with SAS token appended, or original URI if not applicable</returns>
    public async Task<string> AppendSasTokenAsync(string blobUri, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        // Return original URI if service is not enabled
        if (!_isEnabled || _blobServiceClient == null)
        {
            return blobUri;
        }

        try
        {
            // Parse and validate URI
            if (!Uri.TryCreate(blobUri, UriKind.Absolute, out var uri))
            {
                _logger.LogDebug("Invalid URI format, returning original: {Uri}", blobUri);
                return blobUri;
            }

            // Only process URIs from the configured storage account
            if (!uri.Host.Equals($"{_storageAccountName}.blob.core.windows.net", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogDebug("URI is not from configured storage account, returning original: {Uri}", blobUri);
                return blobUri;
            }

            // Check if URI already has a SAS token
            if (uri.Query.Contains("sig=", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogDebug("URI already has SAS token, returning original: {Uri}", blobUri);
                return blobUri;
            }

            // Extract container and blob name from path
            // Path format: /container-name/blob-path
            var pathParts = uri.AbsolutePath.TrimStart('/').Split('/', 2);
            if (pathParts.Length < 2)
            {
                _logger.LogWarning("Unable to extract container and blob name from URI: {Uri}", blobUri);
                return blobUri;
            }

            var containerName = pathParts[0];
            var blobName = pathParts[1];

            // Get blob client
            var blobClient = _blobServiceClient.GetBlobContainerClient(containerName).GetBlobClient(blobName);

            // Generate user delegation SAS token
            var sasUri = await GenerateUserDelegationSasAsync(blobClient, cancellationToken);
            
            _logger.LogDebug("Generated SAS token for blob: {Container}/{Blob}", containerName, blobName);
            
            return sasUri.ToString();
        }
        catch (RequestFailedException ex) when (ex.Status == 403)
        {
            _logger.LogError(ex, 
                "Access denied (403 Forbidden) when generating SAS token for URI: {Uri}. " +
                "Error Code: {ErrorCode}. " +
                "Common causes:\n" +
                "1. Missing 'Storage Blob Delegator' role - Required for user delegation key generation\n" +
                "2. Missing 'Storage Blob Data Reader' role - Required for blob access\n" +
                "3. Role assignment at wrong scope - Must be at storage account level (not subscription or resource group)\n" +
                "4. Role propagation delay - Wait 5-10 minutes after assignment\n" +
                "5. Wrong Azure account - Run 'az account show' to verify correct account\n" +
                "6. Storage firewall rules - Check if your IP is allowed\n" +
                "Troubleshooting: Run 'az role assignment list --assignee $(az ad signed-in-user show --query id -o tsv) --scope /subscriptions/YOUR_SUB/resourceGroups/YOUR_RG/providers/Microsoft.Storage/storageAccounts/{StorageAccount}'",
                blobUri, ex.ErrorCode, _storageAccountName);
            return blobUri;
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, 
                "Failed to generate SAS token for URI: {Uri}. Status: {Status}, Error Code: {ErrorCode}, Message: {Message}",
                blobUri, ex.Status, ex.ErrorCode, ex.Message);
            return blobUri;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error generating SAS token for URI: {Uri}", blobUri);
            return blobUri;
        }
    }

    /// <summary>
    /// Generates a user delegation SAS token for a blob with read permissions.
    /// </summary>
    private async Task<Uri> GenerateUserDelegationSasAsync(
        BlobClient blobClient,
        CancellationToken cancellationToken)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        if (_blobServiceClient == null)
        {
            throw new InvalidOperationException("BlobServiceClient is not initialized");
        }

        // Get user delegation key (valid for the duration of the SAS token)
        var startsOn = DateTimeOffset.UtcNow;
        var expiresOn = startsOn.Add(_sasTokenDuration);
        
        UserDelegationKey userDelegationKey;
        try
        {
            userDelegationKey = await _blobServiceClient.GetUserDelegationKeyAsync(
                startsOn,
                expiresOn,
                cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 403)
        {
            _logger.LogError(
                "Failed to obtain user delegation key - missing 'Storage Blob Delegator' role. " +
                "Error: {ErrorCode}",
                ex.ErrorCode);
            throw;
        }

        // Create SAS builder with read permissions
        BlobSasBuilder sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = blobClient.BlobContainerName,
            BlobName = blobClient.Name,
            Resource = "b", // "b" for blob
            StartsOn = startsOn,
            ExpiresOn = expiresOn
        };

        // Set read permissions only
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        // Generate SAS query parameters using the user delegation key
        var sasQueryParameters = sasBuilder.ToSasQueryParameters(
            userDelegationKey,
            _storageAccountName!);

        // Build URI with SAS token
        BlobUriBuilder uriBuilder = new BlobUriBuilder(blobClient.Uri)
        {
            Sas = sasQueryParameters
        };

        return uriBuilder.ToUri();
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _disposed = true;
            _logger.LogDebug("BlobSasService disposed");
        }
    }
}
