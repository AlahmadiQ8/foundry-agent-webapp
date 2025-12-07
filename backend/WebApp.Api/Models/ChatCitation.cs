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
    
    /// <summary>
    /// The start index of the citation in the message text
    /// </summary>
    public int? StartIndex { get; init; }
    
    /// <summary>
    /// The end index (exclusive) of the citation in the message text
    /// </summary>
    public int? EndIndex { get; init; }
}
