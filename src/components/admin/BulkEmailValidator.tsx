import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useToast } from '@/hooks/use-toast';
import { useCreditModal } from '@/contexts/CreditModalContext';
import { format, parseISO, set, addDays } from 'date-fns';

interface BulkJobResult {
  email: string;
  valid: boolean;
  score: number;
  risk_level: string;
}

interface BulkJob {
  id: string;
  file_name: string;
  total_emails: number;
  processed_emails: number;
  valid_emails: number;
  invalid_emails: number;
  status: string;
  credits_used: number;
  results: BulkJobResult[] | null;
  created_at: string;
  completed_at: string | null;
  scheduled_at: string | null;
  schedule_status: string;
}

// Off-peak hours options (in local time)
const SCHEDULE_OPTIONS = [
  { value: 'immediate', label: 'Start immediately' },
  { value: '02:00', label: '2:00 AM (off-peak)' },
  { value: '03:00', label: '3:00 AM (off-peak)' },
  { value: '04:00', label: '4:00 AM (off-peak)' },
  { value: '05:00', label: '5:00 AM (off-peak)' },
  { value: 'custom', label: 'Custom date/time' },
];

export const BulkEmailValidator = () => {
  const { user } = useAuth();
  const { balance } = useCredits();
  const { showTopUpModal } = useCreditModal();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Scheduling state
  const [scheduleOption, setScheduleOption] = useState('immediate');
  const [customDate, setCustomDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [customHour, setCustomHour] = useState('02');
  const [customMinute, setCustomMinute] = useState('00');
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('bulk_validation_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setJobs(data as any as BulkJob[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchJobs();

    // Subscribe to realtime updates
    if (!user) return;

    const channel = supabase
      .channel('bulk-jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bulk_validation_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchJobs]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or TXT file.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const lines = text.split(/[\r\n,;]+/).filter(line => line.trim());
      
      // Extract emails
      const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
      const emails: string[] = [];
      
      for (const line of lines) {
        const matches = line.match(emailRegex);
        if (matches) {
          emails.push(...matches);
        }
      }

      // Remove duplicates
      const uniqueEmails = [...new Set(emails)];

      if (uniqueEmails.length === 0) {
        toast({
          title: 'No emails found',
          description: 'Could not find any valid email addresses in the file.',
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }

      // Check credits
      if (balance.credits < uniqueEmails.length) {
        showTopUpModal(uniqueEmails.length);
        toast({
          title: 'Insufficient credits',
          description: `You need ${uniqueEmails.length} credits to validate all emails.`,
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }

      // Store pending data and show schedule dialog
      setPendingEmails(uniqueEmails);
      setPendingFileName(file.name);
      setShowScheduleDialog(true);
      setUploading(false);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to process the file.',
        variant: 'destructive',
      });
      setUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getScheduledTime = (): Date | null => {
    if (scheduleOption === 'immediate') return null;
    
    if (scheduleOption === 'custom') {
      if (!customDate) return null;
      return set(customDate, { 
        hours: parseInt(customHour), 
        minutes: parseInt(customMinute), 
        seconds: 0 
      });
    }
    
    // Predefined off-peak times - schedule for next occurrence
    const [hours] = scheduleOption.split(':').map(Number);
    const now = new Date();
    let scheduled = set(now, { hours, minutes: 0, seconds: 0 });
    
    // If time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled = addDays(scheduled, 1);
    }
    
    return scheduled;
  };

  const handleScheduleConfirm = async () => {
    if (pendingEmails.length === 0) return;
    
    setShowScheduleDialog(false);
    setUploading(true);

    try {
      const scheduledAt = getScheduledTime();
      
      // Create job with schedule
      const { data, error } = await supabase.functions.invoke('bulk-validate-email', {
        body: { 
          emails: pendingEmails, 
          fileName: pendingFileName,
          scheduledAt: scheduledAt?.toISOString() || null,
        },
      });

      if (error) throw error;

      if (scheduledAt) {
        toast({
          title: 'Validation scheduled',
          description: `${pendingEmails.length} emails will be validated on ${format(scheduledAt, 'MMM d, yyyy')} at ${format(scheduledAt, 'HH:mm')}.`,
        });
      } else {
        toast({
          title: 'Upload successful',
          description: `Found ${pendingEmails.length} unique emails. Starting validation...`,
        });

        // Start processing immediately
        if (data?.job_id) {
          setProcessing(data.job_id);
          await processJob(data.job_id, pendingEmails, pendingFileName);
        }
      }

      fetchJobs();
    } catch (error) {
      console.error('Schedule error:', error);
      toast({
        title: 'Scheduling failed',
        description: 'Failed to schedule validation.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setPendingEmails([]);
      setPendingFileName('');
      setScheduleOption('immediate');
    }
  };

  const processJob = async (jobId: string, emails: string[], fileName: string) => {
    try {
      await supabase.functions.invoke('bulk-validate-email', {
        body: { jobId, emails, fileName },
      });
      
      toast({
        title: 'Validation complete',
        description: 'Your bulk email validation has finished.',
      });
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setProcessing(null);
      fetchJobs();
    }
  };

  const downloadResults = (job: BulkJob) => {
    if (!job.results) return;

    const csvContent = [
      'email,valid,score,risk_level',
      ...job.results.map(r => `${r.email},${r.valid},${r.score},${r.risk_level}`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-results-${job.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (job: BulkJob) => {
    // Check if scheduled
    if (job.schedule_status === 'scheduled' && job.scheduled_at) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
          <Calendar className="h-3 w-3 mr-1" />
          {format(parseISO(job.scheduled_at), 'MMM d, HH:mm')}
        </Badge>
      );
    }
    
    switch (job.status) {
      case 'completed':
        return <Badge variant="default" className="bg-neon-green/20 text-neon-green"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-primary/20 text-primary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card className="card-cyber">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Bulk Email Validation
        </CardTitle>
        <CardDescription>
          Upload a CSV file with email addresses to validate them in batches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${uploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
            disabled={uploading}
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="font-medium">Processing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Drop your CSV file here or click to upload</p>
                <p className="text-sm text-muted-foreground">
                  Supports CSV and TXT files with email addresses
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Schedule Dialog */}
        {showScheduleDialog && (
          <Card className="border-primary/50">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{pendingFileName}</p>
                  <p className="text-sm text-muted-foreground">{pendingEmails.length} emails to validate</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowScheduleDialog(false);
                  setPendingEmails([]);
                  setPendingFileName('');
                }}>
                  Cancel
                </Button>
              </div>
              
              <div className="space-y-3">
                <Label>When to run validation?</Label>
                <Select value={scheduleOption} onValueChange={setScheduleOption}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {scheduleOption === 'custom' && (
                  <div className="flex gap-3 items-start">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {customDate ? format(customDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customDate}
                          onSelect={setCustomDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <div className="flex items-center gap-1">
                      <Select value={customHour} onValueChange={setCustomHour}>
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>:</span>
                      <Select value={customMinute} onValueChange={setCustomMinute}>
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['00', '15', '30', '45'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <Button onClick={handleScheduleConfirm} className="w-full" disabled={uploading}>
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : scheduleOption === 'immediate' ? (
                  'Start Validation Now'
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Validation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Credits info */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Available credits</span>
          <span className="font-mono font-semibold">{balance.credits.toLocaleString()}</span>
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-semibold">Recent Jobs</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Emails</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium truncate max-w-[150px]">{job.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(job.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.status === 'processing' ? (
                          <div className="space-y-1">
                            <Progress value={(job.processed_emails / job.total_emails) * 100} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {job.processed_emails}/{job.total_emails}
                            </p>
                          </div>
                        ) : (
                          <span>{job.total_emails.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(job)}</TableCell>
                      <TableCell>
                        {job.status === 'completed' && (
                          <div className="flex gap-2 text-sm">
                            <span className="text-neon-green">{job.valid_emails} valid</span>
                            <span className="text-destructive">{job.invalid_emails} invalid</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.status === 'completed' && job.results && (
                          <Button size="sm" variant="outline" onClick={() => downloadResults(job)}>
                            <Download className="h-4 w-4 mr-1" />
                            CSV
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No validation jobs yet</p>
            <p className="text-sm">Upload a CSV file to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
