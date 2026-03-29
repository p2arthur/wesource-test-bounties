import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useAuth } from '../hooks/useAuth';
import { linkWallet } from '../services/api';

interface WalletLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bountyId: number;
}

export default function WalletLinkModal({ isOpen, onClose, onSuccess, bountyId }: WalletLinkModalProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { getAuth } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubId, setGithubId] = useState('');

  const handleLinkWallet = async () => {
    if (!githubUsername || !githubId) {
      enqueueSnackbar('Please enter GitHub username and ID', { variant: 'error' });
      return;
    }

    setIsLinking(true);
    try {
      const headers = await getAuth();
      await linkWallet(githubUsername, parseInt(githubId, 10), headers);
      enqueueSnackbar('Wallet linked successfully!', { variant: 'success' });
      onSuccess();
      onClose();
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to link wallet', { 
        variant: 'error' 
      });
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Link Wallet to Claim Bounty</h2>
        <p className="mb-4 text-gray-600">
          You need to link your GitHub account to claim this bounty. 
          This verifies you're the issue solver.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              GitHub Username
            </label>
            <input
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="octocat"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              GitHub User ID
            </label>
            <input
              type="number"
              value={githubId}
              onChange={(e) => setGithubId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="123456"
            />
            <p className="text-sm text-gray-500 mt-1">
              Find your GitHub ID at github.com/settings/profile
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={isLinking}
          >
            Cancel
          </button>
          <button
            onClick={handleLinkWallet}
            disabled={isLinking || !githubUsername || !githubId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLinking ? 'Linking...' : 'Link Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}
