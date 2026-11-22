using System.Xml.Serialization;
using Jellyfin.Plugin.OIDC.Configuration;
using Jellyfin.Plugin.OIDC.Tests.Fixtures;
using Xunit;

namespace Jellyfin.Plugin.OIDC.Tests;

[Xunit.Collection("OidcPlugin")]
public class EmailUserMappingConfigurationTests(PluginTestFixture fixture)
{
    private static PluginConfiguration Config(params EmailUserMapping[] mappings) => new()
    {
        Providers = [new OidcProviderConfig { ProviderId = "google" }],
        EmailUserMappings = [.. mappings]
    };

    [Theory]
    [InlineData("missing", "alice@gmail.com", "11111111-1111-1111-1111-111111111111")]
    [InlineData("google", "Alice <alice@gmail.com>", "11111111-1111-1111-1111-111111111111")]
    [InlineData("google", "not-an-email", "11111111-1111-1111-1111-111111111111")]
    [InlineData("google", "alice@gmail.com", "not-a-guid")]
    [InlineData("google", "alice@gmail.com", "00000000-0000-0000-0000-000000000000")]
    public void InvalidMappingIsRejected(string provider, string email, string userId)
        => Assert.Throws<ArgumentException>(() => fixture.SetConfiguration(Config(new EmailUserMapping()
            { ProviderId = provider, Email = email, UserId = userId })));

    [Fact]
    public void DuplicateEmailsAreRejectedIgnoringCaseAndWhitespace()
        => Assert.Throws<ArgumentException>(() => fixture.SetConfiguration(Config(
            new() { ProviderId = "google", Email = "alice@gmail.com", UserId = Guid.NewGuid().ToString() },
            new() { ProviderId = "GOOGLE", Email = " ALICE@gmail.com ", UserId = Guid.NewGuid().ToString() })));

    [Fact]
    public void DuplicateTargetsAreRejectedAcrossGuidFormats()
    {
        var id = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => fixture.SetConfiguration(Config(
            new() { ProviderId = "google", Email = "alice@gmail.com", UserId = id.ToString("N") },
            new() { ProviderId = "google", Email = "bob@gmail.com", UserId = id.ToString("D") })));
    }

    [Fact]
    public void MappingSurvivesXmlRoundTripAndLegacyConfigDefaultsEmpty()
    {
        var config = Config(new EmailUserMapping() { ProviderId = "google", Email = "alice@gmail.com", UserId = Guid.NewGuid().ToString("N") });
        var serializer = new XmlSerializer(typeof(PluginConfiguration));
        using var writer = new StringWriter();
        serializer.Serialize(writer, config);
        using var reader = new StringReader(writer.ToString());
        var restored = (PluginConfiguration)serializer.Deserialize(reader)!;
        Assert.Equal(config.EmailUserMappings[0].UserId, Assert.Single(restored.EmailUserMappings).UserId);
        using var legacy = new StringReader("<PluginConfiguration />");
        Assert.Empty(((PluginConfiguration)serializer.Deserialize(legacy)!).EmailUserMappings);
    }
}
