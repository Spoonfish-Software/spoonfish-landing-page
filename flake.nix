{
  description = "Spoonfish landing page — Cloudflare Workers project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            wrangler
            bws
            jq
            just
            gh
          ];

          shellHook = ''
            export PROJECT_ROOT="$PWD"
            if [ -z "''${BWS_ACCESS_TOKEN:-}" ] && [ -t 1 ]; then
              echo "⚠  BWS_ACCESS_TOKEN not set — run: source bin/load-bws-token" >&2
            fi
          '';
        };
      });
}
