{
  description = "DevShell for SRRM";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {inherit system;};
  in {
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        nodejs
        pnpm
        wrangler
      ];

      shellHook = ''
        echo "Entering the development environment!"
        echo "Node: $(node -v), pnpm: $(pnpm -v)"
      '';
    };
  };
}
