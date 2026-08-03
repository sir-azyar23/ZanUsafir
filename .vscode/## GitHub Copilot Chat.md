## GitHub Copilot Chat

- Extension: 0.50.0 (prod)
- VS Code: 1.122.0 (6a49527b96e326fe62fbdb56f60e16877c9aa724)
- OS: linux 6.17.0-29-generic x64
- GitHub Account: sir-azyar23

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.121.6 (18 ms)
- DNS ipv6 Lookup: Error (40 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (3 ms)
- Electron fetch (configured): HTTP 200 (210 ms)
- Node.js https: HTTP 200 (771 ms)
- Node.js fetch: HTTP 200 (359 ms)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.21 (7 ms)
- DNS ipv6 Lookup: Error (5 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (43 ms)
- Electron fetch (configured): HTTP 200 (649 ms)
- Node.js https: HTTP 200 (1050 ms)
- Node.js fetch: HTTP 200 (806 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 20.199.39.224 (71 ms)
- DNS ipv6 Lookup: Error (12 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (11 ms)
- Electron fetch (configured): HTTP 200 (580 ms)
- Node.js https: HTTP 200 (475 ms)
- Node.js fetch: HTTP 200 (510 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (331 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (929 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (758 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (909 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (793 ms)

Number of system certificates: 435

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).