import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { SourceFactoryFactory } from '../artifacts/source_factory/SourceFactoryClient'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying SourceFactory ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(SourceFactoryFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })

  // If app was just created, fund and bootstrap
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    await appClient.send.bootstrap()
    console.log(`Called bootstrap on ${appClient.appClient.appName} (${appClient.appClient.appId})`)
  } else {
    console.log(`App already exists: ${appClient.appClient.appName} (${appClient.appClient.appId})`)
  }
}
