import baileysService from './baileys.service'

async function main() {
  console.log('▶️ Starting Baileys runner...')
  await baileysService.init()
  console.log('✅ Baileys runner initialized. Waiting for connections...')
}

main().catch((err) => {
  console.error('❌ Baileys runner failed:', err)
  process.exit(1)
})
