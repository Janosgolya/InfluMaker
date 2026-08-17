# ☁️ InfluMaker - Instrukcja Uruchomienia 24/7 na Google Cloud Platform (Darmowy Serwer)

Ten poradnik pozwoli Ci w **3 minuty** uruchomić George'a na darmowym serwerze Google Cloud Platform (Always Free Tier `e2-micro`), dzięki czemu publikacje będą realizowane w 100% automatycznie 4 razy dziennie, **nawet gdy Twój komputer jest całkowicie wyłączony**.

---

## 🛠️ Krok 1: Utworzenie Darmowej Maszyny w Google Cloud (1 min)

1. Wejdź na konsolę Google Cloud: [console.cloud.google.com](https://console.cloud.google.com/).
2. W menu po lewej wybierz: **Compute Engine ➔ Instancje maszyn wirtualnych (VM instances)**.
3. Kliknij **Utwórz instancję (Create instance)**:
   - **Nazwa**: `influmaker-bot`
   - **Region**: Wybierz `us-central1` (Iowa), `us-east1` (Karolina Południowa) lub `us-west1` (Oregon) — *w tych regionach maszyna jest bezpłatna na zawsze*.
   - **Konfiguracja maszyny**:
     - Seria: `E2`
     - Typ maszyny: `e2-micro` (2 procesory wirtualne, 1 GB pamięci RAM).
   - **Dysk rozruchowy (Boot disk)**:
     - Kliknij *Zmień* ➔ Wybierz **Ubuntu 22.04 LTS** lub **Ubuntu 24.04 LTS** (Rozmiar: 30 GB standardowy dysk trwały).
4. Kliknij **Utwórz (Create)** na dole.

---

## 💻 Krok 2: Połączenie z Maszyną i Wklejenie Kodu (1 min)

1. Na liście instancji przy maszynie `influmaker-bot` kliknij przycisk **SSH** (otworzy się czarne okno terminala w przeglądarce).
2. Prześlij pliki projektu na serwer lub sklonuj repozytorium:
   ```bash
   git clone <TWOJE_REPOZYTORIUM_GIT> influmaker
   cd influmaker
   ```
   *(Alternatywnie: możesz spakować folder InfluMaker do pliku zip i przesłać go przez przycisk „Prześlij plik” w prawym górnym rogu okna SSH).*

3. Upewnij się, że na maszynie w folderze `config/` znajdują się Twoje pliki sesji:
   - `config/instagram_session.json`
   - `config/tiktok_session.json`
   - oraz plik `.env` z kluczami Fanvue.

---

## 🚀 Krok 3: Automatyczny Start Jedną Komendą (30 sek)

W oknie terminala SSH wpisz:

```bash
chmod +x setup_gcp_vm.sh
./setup_gcp_vm.sh
```

Skrypt automatycznie:
- Zainstaluje Node.js 20, FFmpeg, Playwright i biblioteki przeglądarek,
- Skonfiguruje menedżer procesów **PM2**,
- Uruchomi George'a na harmonogramie 4 slotów dziennie (06:00, 11:00, 16:00, 20:00 UTC),
- Zabezpieczy proces tak, by wstawał automatycznie nawet po ewentualnym restarcie serwera Google.

---

## 📊 Przydatne Komendy do Podglądu:

- **Sprawdzenie statusu bota**:
  ```bash
  pm2 status
  ```
- **Podgląd logów i publikacji na żywo**:
  ```bash
  pm2 logs george-producer-cron
  ```
- **Ręczne wymuszenie jednej publikacji na próbę**:
  ```bash
  node src/agents/george.js --tick
  ```
