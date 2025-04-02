const { ethers } = require("ethers");
const readline = require("readline");

// Konfigurasi jaringan Tea Sepolia
const RPC_URL = "https://tea-sepolia.g.alchemy.com/public";
const CHAIN_ID = 10218;
const PRIVATE_KEY = "PRIVATE_KEY_KALIAN";
const TOKEN_ADDRESS = "CONTRACT_ADDRESS";

// ABI ERC-20 minimal untuk transfer token
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)"
];

// Inisialisasi provider dan wallet
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
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

async function main() {
    try {
        const decimals = await tokenContract.decimals();
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question("Masukkan berapa banyak penerima tokennya: ", (recipientCountInput) => {
            const recipientCount = parseInt(recipientCountInput);
            if (isNaN(recipientCount) || recipientCount <= 0) {
                console.log("Jumlah alamat harus berupa angka positif.");
                rl.close();
                return;
            }

            rl.question("Masukkan jumlah token per alamat: ", async (inputAmount) => {
                const amountToSend = ethers.parseUnits(inputAmount, decimals);
                const recipients = generateRandomAddresses(recipientCount);
                console.log(`\n=== Kirim Token ke ${recipientCount} alamat ===\n`);

                for (let i = 0; i < recipients.length; i++) {
                    try {
                        const tx = await tokenContract.transfer(recipients[i], amountToSend);
                        await tx.wait();
                        console.log(`${i + 1}. Transaksi Berhasil (${recipients[i]})`);
                    } catch (error) {
                        console.log(`${i + 1}. Transaksi Gagal (${recipients[i]}) - ${error.message}`);
                    }
                }

                console.log("\n=== Semua transaksi selesai ===");
                rl.close();
            });
        });
    } catch (error) {
        console.error("Terjadi kesalahan:", error);
    }
}

main();
