{
  description = "YouTube to MP3 Firefox extension";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs = {
    self,
    nixpkgs,
  }: let
    systems = [
      "x86_64-linux"
      "aarch64-linux"
    ];
    forAllSystems = nixpkgs.lib.genAttrs systems;
    version = (nixpkgs.lib.importJSON ./manifest.json).version;
  in {
    packages = forAllSystems (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        default = pkgs.stdenvNoCC.mkDerivation {
          pname = "yt-firefox";
          inherit version;
          src = self;

          nativeBuildInputs = [pkgs.zip];

          # Only package what Firefox needs to load the extension. The
          # remaining files (README, scripts, agent config) stay out of
          # the XPI, matching .web-ext-config.js.
          buildPhase = ''
            runHook preBuild
            mkdir -p dist
            zip -r dist/yt-firefox.xpi manifest.json background.js popup
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            install -Dm644 dist/yt-firefox.xpi "$out/yt-firefox.xpi"
            runHook postInstall
          '';

          meta = {
            description = "Firefox extension that sends YouTube videos to a server for MP3 conversion";
            platforms = systems;
          };
        };
      }
    );

    formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.alejandra);
  };
}
