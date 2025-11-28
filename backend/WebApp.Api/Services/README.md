# Services

## AzureAIAgentService

Manages communication with Azure AI Foundry Agent Service using persistent agents.

**Key Features**:
- Environment-aware credential selection (ChainedTokenCredential for dev, ManagedIdentityCredential for prod)
- Agent pre-loading at startup for faster first request
- Streaming chat responses with SSE
- Image attachment support with validation
- Usage metrics and citation extraction

**Usage**:
```csharp
// Injected as scoped service
app.MapPost("/api/chat/stream", async (
    ChatRequest request,
    AzureAIAgentService agentService,
    CancellationToken ct) => 
{
    var conversationId = await agentService.CreateConversationAsync(request.Message, ct);
    
    await foreach (var chunk in agentService.StreamMessageAsync(
        conversationId, 
        request.Message, 
        request.ImageDataUris, 
        ct))
    {
        // Send chunk to client
    }
    
    var usage = await agentService.GetLastRunUsageAsync(ct);
    var citations = await agentService.GetLastRunCitationsAsync(ct);
});
```

## BlobSasService

Generates user delegation SAS tokens for Azure Blob Storage URIs.

**Key Features**:
- Automatic URI detection (only processes URIs from configured storage account)
- User delegation SAS with Microsoft Entra ID credentials (no account key exposure)
- Configurable token duration
- Read-only permissions
- Graceful fallback (returns original URI if SAS generation fails)

**Usage**:
```csharp
// Injected as scoped service
app.MapPost("/api/chat/stream", async (
    AzureAIAgentService agentService,
    BlobSasService blobSasService,
    CancellationToken ct) => 
{
    // ... streaming logic ...
    
    var citations = await agentService.GetLastRunCitationsAsync(ct);
    if (citations != null)
    {
        // Append SAS tokens to blob URIs
        var citationsWithSas = new List<ChatCitation>();
        foreach (var citation in citations)
        {
            var uriWithSas = await blobSasService.AppendSasTokenAsync(
                citation.Uri, 
                ct);
            citationsWithSas.Add(citation with { Uri = uriWithSas });
        }
        
        // Send citations to client
    }
});
```

**Configuration**:
```bash
# Required
STORAGE_ACCOUNT_NAME=mystorageaccount

# Optional (default: 60)
SAS_TOKEN_DURATION_MINUTES=60
```

**RBAC Requirements**:
- Storage Blob Data Reader
- Storage Blob Delegator

See `BLOB_SAS_CONFIGURATION.md` for detailed setup instructions.

## Service Registration

Services are registered in `Program.cs`:

```csharp
// Both services use scoped lifetime for proper disposal
builder.Services.AddScoped<AzureAIAgentService>();
builder.Services.AddScoped<BlobSasService>();
```

**Scoped lifetime rationale**:
- Ensures proper disposal of resources (HttpClients, SemaphoreSlim)
- Per-request isolation for thread safety
- Preferred for services making external API calls
