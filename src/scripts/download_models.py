import urllib.request
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

MODELS = {
    "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors": "https://huggingface.co/RunDiffusion/Juggernaut-XL-v9/resolve/main/Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors",
    "epiCRealism_naturalSinRC1VAE.safetensors": "https://huggingface.co/emilianJR/epiCRealism/resolve/main/epCRealism_naturalSinRC1VAE.safetensors",
    "ponyDiffusionV6XL_v6StartWithThisOne.safetensors": "https://huggingface.co/AstraliteHeart/pony-diffusion-v6-xl/resolve/main/ponyDiffusionV6XL_v6StartWithThisOne.safetensors"
}

OUTPUT_DIR = r"I:\ComfyUI_windows_portable\ComfyUI\models\checkpoints"

def download_model(filename, url):
    output_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(output_path):
        print(f"{filename} already exists, skipping.")
        return
        
    print(f"Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, output_path)
        print(f"Successfully downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

if __name__ == "__main__":
    if not os.path.exists(OUTPUT_DIR):
        print(f"Output directory not found: {OUTPUT_DIR}")
    else:
        for filename, url in MODELS.items():
            download_model(filename, url)
        print("All downloads completed.")
