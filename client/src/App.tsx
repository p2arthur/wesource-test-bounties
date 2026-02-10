import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Layout from './components/Layout'
import { ProjectProvider } from './contexts/ProjectContext'
import { VoteProvider } from './contexts/VoteContext'
import { Web3AuthProvider } from './contexts/Web3AuthContext'
import Home from './Home'
import BountyPage from './pages/BountyPage'
import ProjectPage from './pages/ProjectPage'
import ProfilePage from './pages/ProfilePage'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [{ id: WalletId.DEFLY }, { id: WalletId.PERA }, { id: WalletId.EXODUS }]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <Web3AuthProvider>
          <ProjectProvider>
            <VoteProvider>
              <BrowserRouter>
                <div className="min-h-screen flex flex-col">
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/project/:projectId" element={<ProjectPage />} />
                      <Route path="/bounty/:bountyId" element={<BountyPage />} />
                      <Route path="/profile/:walletAddress" element={<ProfilePage />} />
                    </Routes>
                  </Layout>
                  <Footer />
                </div>
              </BrowserRouter>
            </VoteProvider>
          </ProjectProvider>
        </Web3AuthProvider>
      </WalletProvider>
    </SnackbarProvider>
  )
}
