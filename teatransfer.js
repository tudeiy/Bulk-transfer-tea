require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

// 🔧 Load multi-account config
const accounts = process.env.ACCOUNTS?.split(',').map(a => a.trim()).filter(Boolean) || [];

// 🔧 Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 📤 Kirim pesan Telegram (hanya jika token & chat id tersedia)
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        });
    } catch (error) {
        console.error("❌ Telegram Error:", error.response?.data || error.message);
    }
}

// ⛽ Delay utils
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function randomDelay() {
    const min = 15000;
    const max = 20000;
    const delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏱️ Delay ${delayTime / 1000}s sebelum transaksi berikutnya...`);
    return delay(delayTime);
}

// 📥 Ambil file dari GitHub
async function fetchKYCAddresses() {
    try {
        console.log("🌐 Mengunduh daftar alamat KYC dari GitHub...");
        const res = await axios.get("https://raw.githubusercontent.com/tudeiy/Bulk-transfer-tea/main/addressteasepoliakyc.txt");
        return res.data.split('\n').map(addr => addr.trim().toLowerCase()).filter(Boolean);
    } catch (error) {
        console.error("❌ Gagal ambil KYC:", error.message);
        return [];
    }
}

// 📂 File utils
function readAddressesFromFile(filename) {
    if (!fs.existsSync(filename)) return [];
    const data = fs.readFileSync(filename, 'utf8');
    return data.split('\n').map(line => line.trim().toLowerCase()).filter(Boolean);
}
function writeAddressesToFile(filename, addresses) {
    fs.writeFileSync(filename, addresses.join('\n'), 'utf8');
}

// 🔁 Proses per akun
async function runForAccount(accountName, index) {
    const prefix = accountName.toUpperCase();
    const PRIVATE_KEY = process.env[`${prefix}_PRIVATE_KEY`];
    const RPC_URL = process.env[`${prefix}_RPC_URL`];
    const TOKEN_ADDRESS = process.env[`${prefix}_TOKEN_ADDRESS`];

    if (!PRIVATE_KEY || !RPC_URL || !TOKEN_ADDRESS) {
        console.error(`❌ Konfigurasi tidak lengkap untuk ${accountName}`);
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const token = new ethers.Contract(TOKEN_ADDRESS, [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() view returns (uint8)"
    ], wallet);

    try {
        const decimals = await token.decimals();
        const amount = ethers.parseUnits("1.0", decimals);
        const kyc = await fetchKYCAddresses();

        const sentFile = path.join("accounts", `${accountName}_sent.txt`);
        const pendingFile = path.join("accounts", `${accountName}_pending.txt`);

        let sent = readAddressesFromFile(sentFile);
        let recipients = kyc.filter(addr => !sent.includes(addr));

        if (recipients.length === 0) {
            console.log(`✅ [${accountName}] Semua alamat sudah dikirimi.`);
            await sendTelegramMessage(`✅ *Akun ${index + 1}* (${accountName}) tidak ada alamat baru untuk transfer.`);
            return;
        }

        const limit = Math.min(recipients.length, Math.floor(Math.random() * (150 - 100 + 1)) + 100);
        await sendTelegramMessage(`📦 *Akun ${index + 1}* (${accountName}) akan mengirim ke *${limit}* alamat hari ini.`);

        const shuffled = recipients.sort(() => 0.5 - Math.random()).slice(0, limit);
        const failed = [];

        for (let i = 0; i < shuffled.length; i++) {
            const recipient = shuffled[i];
            try {
                const tx = await token.transfer(recipient, amount);
                await tx.wait();
                console.log(`✅ [${accountName}] ${i + 1}/${limit} → ${recipient}`);
                sent.push(recipient);
            } catch (err) {
                console.log(`❌ [${accountName}] Gagal ke ${recipient}: ${err.message}`);
                await sendTelegramMessage(`❌ *Akun ${index + 1}* (${accountName}) gagal ke \`${recipient}\`\n_Error:_ ${err.message}`);
                failed.push(recipient);
            }
            await delay(5000);
        }

        writeAddressesToFile(sentFile, sent);
        writeAddressesToFile(pendingFile, failed);

        await sendTelegramMessage(`✅ *Akun ${index + 1}* (${accountName}) selesai transfer.`);
    } catch (e) {
        console.error(`❌ [${accountName}] Error fatal:`, e.message);
        await sendTelegramMessage(`❌ *Akun ${index + 1}* (${accountName}) error: ${e.message}`);
    }
}

// 🧠 Jalankan semua akun
async function runAllAccounts() {
    await sendTelegramMessage("🚀 *Script TeaTransfer dimulai!*");
    for (let i = 0; i < accounts.length; i++) {
        await runForAccount(accounts[i], i);
    }
    await sendTelegramMessage("✅ *Semua akun selesai transfer hari ini.*");
}

// ⏰ Jadwal harian antara 12:00–15:00 WIB
function getRandomExecutionTime() {
    const now = new Date();
    const startUTC = 5;
    const endUTC = 8;

    const hour = Math.floor(Math.random() * (endUTC - startUTC + 1)) + startUTC;
    const minute = Math.floor(Math.random() * 60);

    const target = new Date();
    target.setUTCHours(hour, minute, 0, 0);
    if (target <= now) target.setUTCDate(target.getUTCDate() + 1);

    const ms = target - now;
    console.log(`📅 Script dijadwalkan untuk ${target.toLocaleTimeString('id-ID')} WIB`);
    return ms;
}

async function scheduleDailyExecution() {
    while (true) {
        const delayMs = getRandomExecutionTime();
        const time = new Date(Date.now() + delayMs);
        console.log(`🕒 Menunggu hingga ${time.toLocaleTimeString('id-ID')} WIB...`);
        await delay(delayMs);
        await runAllAccounts();
        console.log("✅ Selesai. Menjadwalkan hari berikutnya...");
    }
}

// 🚀 Eksekusi awal
const args = process.argv.slice(2);
if (args.includes('--now')) {
    (async () => {
        console.log("🚀 Menjalankan sekarang karena ada flag '--now'");
        await runAllAccounts();
        await scheduleDailyExecution();
    })();
} else {
    scheduleDailyExecution();
}
