namespace WebApp.Api.Models;

/// <summary>
/// Represents a citation in a chat message response
/// </summary>
public record ChatCitation
{
    /// <summary>
    /// The URI/URL of the cited source
    /// </summary>
    public required string Uri { get; init; }
    
    /// <summary>
    /// The title or name of the cited source
    /// </summary>
    public string? Title { get; init; }
}
