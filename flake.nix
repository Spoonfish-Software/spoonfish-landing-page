{
  description = "Spoonfish landing page — Cloudflare Worker, deployed via spoonfish-infra-templates";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # git+ssh (not github:) so Nix uses SSH key auth — required for the private
    # spoonfish-infra-templates repo. The `github:` fetcher uses HTTPS API which
    # 404s anonymously on private repos.
    spoonfish-infra = {
      url = "git+ssh://git@github.com/Spoonfish-Software/spoonfish-infra-templates";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
    };
  };

  outputs = { self, nixpkgs, flake-utils, spoonfish-infra, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in {
        devShells.default = spoonfish-infra.lib.mkCloudflareWorkerShell pkgs;
      });
}
