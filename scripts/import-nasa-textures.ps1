# Copy NASA-3D-Resources "Images and Textures" JPGs into client/public/textures/nasa
# Run from repo root: .\scripts\import-nasa-textures.ps1

$repoRoot = Split-Path -Parent $PSScriptRoot
$nasaRoot = Join-Path $repoRoot "NASA-3D-Resources\Images and Textures"
$target = Join-Path $repoRoot "client\public\textures\nasa"

if (-not (Test-Path $nasaRoot)) {
    Write-Error "NASA-3D-Resources not found at: $nasaRoot"
    exit 1
}

New-Item -ItemType Directory -Path $target -Force | Out-Null

# Flat names under /textures/nasa — app references these paths.
$files = @(
    @{ src = "Venus\Venus.jpg"; dst = "venus_nasa.jpg" },
    @{ src = "Earth (A)\Earth (A).jpg"; dst = "earth_nasa.jpg" },
    @{ src = "Earth (B)\Earth (B).jpg"; dst = "earth_b_nasa.jpg" },
    @{ src = "Mars\Mars.jpg"; dst = "mars_nasa.jpg" },
    @{ src = "Mars - Phobos\Mars - Phobos.jpg"; dst = "phobos_nasa.jpg" },
    @{ src = "Mars - Deimos\Mars - Deimos.jpg"; dst = "deimos_nasa.jpg" },
    @{ src = "Moon\Moon.jpg"; dst = "moon_nasa.jpg" },
    @{ src = "Jupiter\Jupiter.jpg"; dst = "jupiter_nasa.jpg" },
    @{ src = "Saturn\Saturn.jpg"; dst = "saturn_nasa.jpg" },
    @{ src = "Neptune\Neptune.jpg"; dst = "neptune_nasa.jpg" },
    @{ src = "Jupiter - Io (A)\Jupiter - Io (A).jpg"; dst = "io_nasa.jpg" },
    @{ src = "Jupiter - Io (B)\Jupiter - Io (B).jpg"; dst = "io_b_nasa.jpg" },
    @{ src = "Jupiter - Europa\Jupiter - Europa.jpg"; dst = "europa_nasa.jpg" },
    @{ src = "Jupiter - Ganymede\Jupiter - Ganymede.jpg"; dst = "ganymede_nasa.jpg" },
    @{ src = "Jupiter - Callisto\Jupiter - Callisto.jpg"; dst = "callisto_nasa.jpg" },
    @{ src = "Saturn - Titan\Saturn - Titan.jpg"; dst = "titan_nasa.jpg" },
    @{ src = "Saturn - Enceladus\Saturn - Enceladus.jpg"; dst = "enceladus_nasa.jpg" },
    @{ src = "Saturn - Mimas\Saturn - Mimas.jpg"; dst = "mimas_nasa.jpg" },
    @{ src = "Saturn - Dione\Saturn - Dione.jpg"; dst = "dione_nasa.jpg" },
    @{ src = "Saturn - Rhea\Saturn - Rhea.jpg"; dst = "rhea_nasa.jpg" },
    @{ src = "Saturn - Tethys\Saturn - Tethys.jpg"; dst = "tethys_nasa.jpg" },
    @{ src = "Saturn - Iapetus\Saturn - Iapetus.jpg"; dst = "iapetus_nasa.jpg" },
    @{ src = "Neptune - Triton\Neptune - Triton.jpg"; dst = "triton_nasa.jpg" },
    @{ src = "Pluto\Pluto.jpg"; dst = "pluto_nasa.jpg" },
    @{ src = "Pluto - Charon\Pluto - Charon.jpg"; dst = "charon_nasa.jpg" },
    @{ src = "Uranus - Miranda\Uranus - Miranda.jpg"; dst = "miranda_nasa.jpg" },
    @{ src = "Uranus - Ariel\Uranus - Ariel.jpg"; dst = "ariel_nasa.jpg" },
    @{ src = "Uranus - Umbriel\Uranus - Umbriel.jpg"; dst = "umbriel_nasa.jpg" },
    @{ src = "Uranus - Titania\Uranus - Titania.jpg"; dst = "titania_nasa.jpg" },
    @{ src = "Uranus - Oberon\Uranus - Oberon.jpg"; dst = "oberon_nasa.jpg" }
)

foreach ($f in $files) {
    $src = Join-Path $nasaRoot $f.src
    $dst = Join-Path $target $f.dst
    if (-not (Test-Path $src)) {
        Write-Warning "Skip missing: $src"
        continue
    }
    Copy-Item $src $dst -Force
    Write-Host "Copied: $($f.src) -> $($f.dst)"
}

Write-Host "Done. NASA textures ready at: $target"
Write-Host "Note: Mercury, Uranus (planet), Ceres, Eris, etc. have no matching folder in this bundle."
