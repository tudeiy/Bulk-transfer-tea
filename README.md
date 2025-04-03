# Bulk-transfer-tea By ETRx Crypto
Send bulk transfer for Tea sepolia testnet

Kalian bisa transfer tea secara massal ke banyak alamat di jaringan Tea Sepolia , Kalian setting setting aja ntar botnya mau kirim berapa berapanya dan ngatur jumlah token secara acak .

**SEBELUM MEMULAI ALANGKAH BAIKNYA LAKUKAN BEBERAPA HAL BERIKUT INI**

# Claim Faucet kalian
Claim disini : https://faucet-assam.tea.xyz/#/


# Deploy Token
Deploy Disini : https://sepolia.tea.xyz/address/0x847d23084C474E7a0010Da5Fa869b40b321C8D7b?tab=write_contract

**Notes : Sesudah deploy, copy contract address token kalian**

# Clone repositorynya
```
git clone https://github.com/freezydkz/Bulk-transfer-tea.git
cd Bulk-transfer-tea
```
# Install NPM dan dotenv dulu di Linux
```
apt install npm
```
```
npm install dotenv
```

# Install Dependencies

```
npm install ethers
```

Step by Step menggunakan botnya :
- Pastikan kalian sudah menyelesaikan semua hal diatas
- Buka file .env di editor text vps kalian
- Cari bagian PRIVATE_KEY_KALIAN dan isi dengan private key kalian
- Cari bagian CONTRACT_ADDRESS dan paste contract address token kalian
- Cari bagian RPC_URL dan CHAIN_ID , pastikan sesuai dengan RPC dan Chain ID terbaru Tea Sepolia
- Save file .env nya
- Jalankan scriptnya pake command ini :
```
  node teatransfer.js
```
- Masukkan jumlah penerima dan Jumlah token yang akan dikirim
- Selesai, selamat berbulking bulking ria~

Join our telegram community here : https://t.me/ETRxCrypto
