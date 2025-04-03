require("dotenv").config(); // Load variabel lingkungan dari .env
const { ethers } = require("ethers");
const readline = require("readline");

// Mengambil konfigurasi dari file .env
const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = process.env.CHAIN_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;

if (!PRIVATE_KEY || !RPC_URL || !TOKEN_ADDRESS || !CHAIN_ID) {
    console.error("? ERROR: Pastikan file .env sudah dikonfigurasi dengan benar.");
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

// Fungsi untuk menghasilkan alamat acak
function generateRandomAddresses(count) {
    let addresses = [];
    for (let i = 0; i < count; i++) {
        let randomWallet = ethers.Wallet.createRandom();
        addresses.push(randomWallet.address);
    }
    return addresses;
}

// ?? FITUR BARU: Jam eksekusi yang diperbolehkan
const allowedHours = [8, 12, 15, 19, 21];

// ?? FITUR BARU: Pilih jam eksekusi secara acak
function getRandomExecutionTime() {
    return allowedHours[Math.floor(Math.random() * allowedHours.length)];
}

// ?? FITUR BARU: Tunggu hingga jam eksekusi tiba
async function waitUntilExecution() {
    let now = new Date();
    let targetHour = getRandomExecutionTime();
    
    let executionTime = new Date();
    executionTime.setHours(targetHour, 0, 0, 0);

    if (executionTime < now) {
        executionTime.setDate(executionTime.getDate() + 1); // Jika lewat, pindah ke hari berikutnya
    }

    let waitTime = executionTime - now;
    console.log(`Menunggu hingga jam ${targetHour}:00 untuk mulai mengirim...`);
    return new Promise(resolve => setTimeout(resolve, waitTime));
}

// ?? FITUR BARU: Delay antar transaksi (5 detik)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ?? FITUR BARU: Fungsi otomatis untuk mengirim transaksi
async function autoSendTokens() {
    await waitUntilExecution(); // Tunggu waktu eksekusi

    try {
        const decimals = await tokenContract.decimals();
        const transactionCount = Math.floor(Math.random() * (300 - 100 + 1) + 100); // Random 100 - 300 transaksi
        console.log(`Memulai pengiriman ${transactionCount} transaksi...`);

        for (let i = 0; i < transactionCount; i++) {
            let recipient = ethers.Wallet.createRandom().address; // Menggunakan alamat acak
            const amountToSend = ethers.parseUnits("1.0", decimals); // Kirim 1 token (ubah sesuai kebutuhan)

            try {
                const tx = await tokenContract.transfer(recipient, amountToSend);
                await tx.wait();
                console.log(`${i + 1}. Berhasil dikirim ke ${recipient}`);
            } catch (error) {
                console.log(`${i + 1}. Gagal dikirim ke ${recipient} - ${error.message}`);
            }

            await delay(5000); // Jeda 5 detik antar transaksi
        }

        console.log("? Semua transaksi selesai.");
    } catch (error) {
        console.error("? Terjadi kesalahan:", error);
    }
}

// ?? Jalankan mode otomatis
autoSendTokens();
