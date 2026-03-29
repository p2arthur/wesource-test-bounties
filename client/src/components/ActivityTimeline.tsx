import { Link } from 'react-router-dom';
import { FiPlusCircle, FiCheckCircle, FiRotateCcw, FiXCircle } from 'react-icons/fi';
import { Card, CardContent } from './ui/card';
import { Transaction, TransactionType } from '../services/api';

interface ActivityTimelineProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTransactionIcon(type: TransactionType) {
  const iconProps = { className: 'w-5 h-5' };

  switch (type) {
    case 'BOUNTY_CREATED':
      return <FiPlusCircle {...iconProps} className="w-5 h-5 text-orange-500" />;
    case 'BOUNTY_CLAIMED':
      return <FiCheckCircle {...iconProps} className="w-5 h-5 text-green-500" />;
    case 'BOUNTY_REFUNDED':
      return <FiRotateCcw {...iconProps} className="w-5 h-5 text-red-500" />;
    case 'BOUNTY_REVOKED':
      return <FiXCircle {...iconProps} className="w-5 h-5 text-red-500" />;
    case 'BOUNTY_CANCELLED':
      return <FiXCircle {...iconProps} className="w-5 h-5 text-text-muted" />;
    default:
      return <FiPlusCircle {...iconProps} className="w-5 h-5 text-text-secondary" />;
  }
}

function getActionText(transaction: Transaction): string {
  const repoUrl = transaction.bounty.repository.githubUrl;
  const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  const repo = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : 'Unknown';
  const issue = transaction.bounty.issueNumber;

  switch (transaction.type) {
    case 'BOUNTY_CREATED':
      return `Created bounty for ${repo}#${issue}`;
    case 'BOUNTY_CLAIMED':
      return `Claimed bounty for ${repo}#${issue}`;
    case 'BOUNTY_REFUNDED':
      return `Refunded bounty for ${repo}#${issue}`;
    case 'BOUNTY_REVOKED':
      return `Revoked bounty for ${repo}#${issue}`;
    case 'BOUNTY_CANCELLED':
      return `Cancelled bounty for ${repo}#${issue}`;
    default:
      return `Transaction for ${repo}#${issue}`;
  }
}

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-4 pb-4 border-b border-border-default last:border-b-0">
            <div className="h-5 w-5 rounded-full flex-shrink-0 bg-bg-elevated animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-bg-elevated rounded animate-pulse" />
              <div className="h-3 w-32 bg-bg-elevated rounded animate-pulse" />
            </div>
          </div>
        ))}
    </div>
  );
}

export default function ActivityTimeline({ transactions, isLoading = false }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-6">Recent Activity</h3>
          <ActivityTimelineSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          <p className="text-sm text-text-secondary">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">Recent Activity</h3>
        <div className="space-y-0">
          {transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className={`flex gap-4 py-4 ${index !== transactions.length - 1 ? 'border-b border-border-default' : ''}`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 flex items-start justify-center pt-0.5">
                {getTransactionIcon(transaction.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/bounties/${transaction.bountyId}`}
                  className="text-sm font-medium text-text-primary hover:text-accent transition-colors block mb-1"
                >
                  {getActionText(transaction)}
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <span className="text-sm text-text-secondary">
                    {(transaction.amount / 1_000_000).toFixed(2)} ALGO
                  </span>
                  <span className="text-xs text-text-muted">{getRelativeTime(transaction.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
