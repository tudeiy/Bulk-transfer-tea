require("dotenv").config(); // Memuat variabel lingkungan dari .env
const { ethers } = require("ethers");
const fs = require("fs");
const readline = require("readline");
const axios = require("axios");

// Mengambil konfigurasi dari file .env
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;

if (!PRIVATE_KEY || !RPC_URL || !TOKEN_ADDRESS) {
    console.error("❌ ERROR: Pastikan file .env sudah dikonfigurasi dengan benar.");
    process.exit(1);
}

// ABI ERC-20 minimal untuk transfer token
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)"
];

// Inisialisasi provider dan wallet
const provider = new ethers.JsonRpcProvider(RPC_URL, {
    chainId: 10218, // Chain ID untuk Tea Sepolia
    name: "tea-sepolia"
});
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);

// Fungsi untuk membaca daftar alamat dari file
function readAddressesFromFile(filename) {
    if (!fs.existsSync(filename)) return [];
    const data = fs.readFileSync(filename, 'utf8');
    return data.split('\n').map(line => line.trim()).filter(line => line !== '');
}

// Fungsi untuk menyimpan daftar alamat ke file
function writeAddressesToFile(filename, addresses) {
    fs.writeFileSync(filename, addresses.join('\n'), 'utf8');
}

// Fungsi untuk mengunduh daftar alamat KYC secara langsung dari URL raw GitHub
async function fetchKYCAddresses() {
    try {
        console.log("🌍 Mengunduh daftar alamat KYC dari repository GitHub...");
        const response = await axios.get("https://raw.githubusercontent.com/clwkevin/LayerOS/main/addressteasepoliakyc.txt");
        if (response.data) {
            return response.data.split('\n').map(addr => addr.trim().toLowerCase());
        } else {
            console.error("❌ ERROR: Tidak dapat mengunduh data alamat KYC.");
            return [];
        }
    } catch (error) {
        console.error("❌ ERROR: Gagal mengunduh daftar KYC dari GitHub.", error.message);
        return [];
    }
}

// Waktu operasi dalam jam WIB
const operationalHours = [8, 12, 15, 19, 21];

// Fungsi untuk menunggu sampai jam operasi
async function waitForNextRun() {
    while (true) {
        let now = new Date();
        let hour = now.getHours();
        
        if (operationalHours.includes(hour)) {
            console.log(`🕒 Sekarang jam ${hour}:00 WIB, mulai mengirim transaksi...`);
            return;
        }
        
        console.log("🕒 Di luar jam operasi, menunggu...");
        await new Promise(resolve => setTimeout(resolve, 60000)); // Cek setiap 1 menit
    }
}

// Fungsi untuk menunda eksekusi
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    await waitForNextRun();

    try {
        const decimals = await tokenContract.decimals();
        let kycAddresses = await fetchKYCAddresses();
        if (kycAddresses.length === 0) {
            console.error("❌ ERROR: Tidak ada alamat KYC yang ditemukan.");
            return;
        }

        let sentRecipients = readAddressesFromFile('kyc_addresses_sent.txt');
        let recipients = kycAddresses.filter(addr => !sentRecipients.includes(addr));

        if (recipients.length === 0) {
            console.log("✅ Semua alamat KYC sudah menerima token.");
            return;
        }

        console.log(`📋 Ada ${recipients.length} alamat yang belum menerima token.`);
        
        let transactionLimit = Math.min(recipients.length, Math.floor(Math.random() * (150 - 100 + 1) + 100));
        console.log(`🔄 Akan mengirim ${transactionLimit} transaksi hari ini.`);

        let failedRecipients = [];

        for (let i = 0; i < transactionLimit; i++) {
            try {
                let recipient = recipients[i];
                const amountToSend = ethers.parseUnits("1.0", decimals); // Kirim 1 token

                const tx = await tokenContract.transfer(recipient, amountToSend);
                await tx.wait();
                console.log(`✅ ${i + 1}. Transaksi Berhasil (${recipient})`);

                sentRecipients.push(recipient);
            } catch (error) {
                console.log(`❌ ${i + 1}. Transaksi Gagal (${recipients[i]}) - ${error.message}`);
                failedRecipients.push(recipients[i]);
            }
            await delay(5000); // Jeda 5 detik
        }

        writeAddressesToFile('kyc_addresses_pending.txt', failedRecipients);
        writeAddressesToFile('kyc_addresses_sent.txt', sentRecipients);

        console.log("✅ Semua transaksi hari ini selesai.");
    } catch (error) {
        console.error("❌ ERROR:", error);
    }
}

main();
