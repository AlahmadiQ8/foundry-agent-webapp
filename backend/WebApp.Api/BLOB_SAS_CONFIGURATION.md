# Blob SAS Token Configuration

This document describes how to configure user delegation SAS tokens for Azure Blob Storage citations.

## Overview

The `BlobSasService` automatically appends user delegation SAS tokens to blob URIs returned in chat citations. This provides secure, time-limited access to private blob storage without exposing storage account keys.

## Configuration

### Environment Variables

Set the following environment variables:

```bash
# Required: The name of your Azure Storage account
STORAGE_ACCOUNT_NAME=yourstorageaccount

# Optional: SAS token duration in minutes (default: 60)
SAS_TOKEN_DURATION_MINUTES=60
```

### Local Development (.env file)

Add to `backend/WebApp.Api/.env`:

```ini
STORAGE_ACCOUNT_NAME=yourstorageaccount
SAS_TOKEN_DURATION_MINUTES=60
```

### Azure Container Apps (Production)

Set environment variables in Container App configuration:

```bash
az containerapp update \
  --name <app-name> \
  --resource-group <resource-group> \
  --set-env-vars \
    STORAGE_ACCOUNT_NAME=yourstorageaccount \
    SAS_TOKEN_DURATION_MINUTES=60
```

Or via Bicep:

```bicep
env: [
  {
    name: 'STORAGE_ACCOUNT_NAME'
    value: storageAccount.name
  }
  {
    name: 'SAS_TOKEN_DURATION_MINUTES'
    value: '60'
  }
]
```

## Azure RBAC Requirements

The managed identity (or user account for local dev) needs the following roles on the storage account:

1. **Storage Blob Data Reader** - To read blob metadata
   ```bash
   az role assignment create \
     --role "Storage Blob Data Reader" \
     --assignee <principal-id> \
     --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>
   ```

2. **Storage Blob Delegator** - To generate user delegation keys
   ```bash
   az role assignment create \
     --role "Storage Blob Delegator" \
     --assignee <principal-id> \
     --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>
   ```

## How It Works

1. When the AI agent returns citations with blob URIs (e.g., `https://storageaccount.blob.core.windows.net/container/file.pdf`)
2. The `BlobSasService` intercepts these URIs before sending to the client
3. For each blob URI from the configured storage account:
   - Requests a user delegation key from Azure Storage (valid for the configured duration)
   - Generates a SAS token with read-only permissions
   - Appends the SAS token to the URI as query parameters
4. The client receives URIs with embedded SAS tokens (e.g., `https://storageaccount.blob.core.windows.net/container/file.pdf?sv=...&sig=...`)

## Security Features

- **User Delegation SAS**: Uses Microsoft Entra ID credentials instead of storage account keys
- **Time-Limited**: Tokens expire after the configured duration (default 1 hour)
- **Read-Only**: SAS tokens only grant read permissions
- **No Key Exposure**: Storage account keys never leave Azure
- **Automatic Fallback**: If SAS generation fails, returns original URI (for non-blob URIs or errors)

## Behavior

### When SAS Tokens Are Applied

- URI is from the configured storage account
- URI does not already have a SAS token
- Service is properly configured with `STORAGE_ACCOUNT_NAME`

### When Original URI Is Returned

- `STORAGE_ACCOUNT_NAME` is not configured (SAS disabled)
- URI is not from the configured storage account
- URI already contains a SAS token
- URI is malformed or not a blob URI
- RBAC permissions are insufficient (logged as warning)

## Logging

The service logs detailed information at different levels:

- **Info**: Initialization status, storage account name, SAS duration
- **Debug**: Each SAS token generation, URIs being processed
- **Warning**: Configuration issues, RBAC permission errors
- **Error**: Unexpected failures during token generation

## Example Citations Flow

### Without SAS Service
```json
{
  "type": "citations",
  "citations": [
    {
      "uri": "https://mystorageaccount.blob.core.windows.net/documents/report.pdf",
      "title": "Annual Report 2024"
    }
  ]
}
```

### With SAS Service
```json
{
  "type": "citations",
  "citations": [
    {
      "uri": "https://mystorageaccount.blob.core.windows.net/documents/report.pdf?sv=2024-11-04&sr=b&sig=ABC123...&sp=r&se=2024-11-29T15:30:00Z",
      "title": "Annual Report 2024"
    }
  ]
}
```

## Troubleshooting

### SAS tokens not being generated

1. Check logs for initialization warnings
2. Verify `STORAGE_ACCOUNT_NAME` is set correctly
3. Ensure managed identity has required RBAC roles
4. For local dev, ensure `az login` or `azd auth login` is completed

### "Access denied" errors (403)

- Assign **Storage Blob Delegator** role to the managed identity
- Assign **Storage Blob Data Reader** role to the managed identity
- Wait a few minutes for RBAC propagation

### SAS tokens expire too quickly

- Increase `SAS_TOKEN_DURATION_MINUTES` (max 7 days = 10080 minutes)
- Note: Shorter durations are more secure

## References

- [Microsoft Learn: Create user delegation SAS with .NET](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-dotnet)
- [Azure Storage RBAC roles](https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access)
- [SAS best practices](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
