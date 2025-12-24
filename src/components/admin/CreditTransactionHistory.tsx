import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, ArrowUpCircle, ArrowDownCircle, RefreshCw, CreditCard, Gift, Undo, Search, Filter, Calendar } from 'lucide-react';
import { useCredits, CreditTransaction } from '@/hooks/useCredits';
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  purchase: { icon: CreditCard, color: 'text-neon-green', label: 'Purchase' },
  deduction: { icon: ArrowDownCircle, color: 'text-destructive', label: 'Deduction' },
  subscription: { icon: RefreshCw, color: 'text-primary', label: 'Subscription' },
  referral: { icon: Gift, color: 'text-neon-purple', label: 'Referral' },
  refund: { icon: Undo, color: 'text-neon-orange', label: 'Refund' },
  adjustment: { icon: ArrowUpCircle, color: 'text-muted-foreground', label: 'Adjustment' },
};

export const CreditTransactionHistory = () => {
  const { transactions, fetchTransactions, loading } = useCredits();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Search filter (description)
      if (searchQuery && !tx.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Date range filter
      const txDate = parseISO(tx.created_at);
      if (startDate) {
        const start = startOfDay(parseISO(startDate));
        if (isBefore(txDate, start)) return false;
      }
      if (endDate) {
        const end = endOfDay(parseISO(endDate));
        if (isAfter(txDate, end)) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, searchQuery, startDate, endDate]);

  const clearFilters = () => {
    setTypeFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = typeFilter !== 'all' || searchQuery || startDate || endDate;

  return (
    <Card className="card-cyber">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Transaction History
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => fetchTransactions()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="deduction">Deduction</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
              placeholder="Start date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
              placeholder="End date"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.adjustment;
                  const Icon = config.icon;
                  const isPositive = tx.amount > 0;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {format(parseISO(tx.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Icon className={`h-3 w-3 ${config.color}`} />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${isPositive ? 'text-neon-green' : 'text-destructive'}`}>
                        {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.balance_after.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
