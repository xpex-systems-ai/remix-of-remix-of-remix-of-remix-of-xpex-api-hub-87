import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';

interface ScheduledJob {
  id: string;
  file_name: string;
  total_emails: number;
  scheduled_at: string;
  status: string;
  schedule_status: string;
  created_at: string;
  completed_at?: string;
  valid_emails?: number;
  invalid_emails?: number;
}

export const ScheduledValidations = () => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [history, setHistory] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    emails: '',
    scheduled_at: '',
  });
  const { toast } = useToast();
  const { session } = useAuth();

  const fetchJobs = async () => {
    if (!session?.access_token) return;

    try {
      // Fetch scheduled jobs
      const { data: scheduledData } = await supabase.functions.invoke('bot-scheduled-validation', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      });

      if (scheduledData?.jobs) {
        setJobs(scheduledData.jobs);
      }

      // Fetch history
      const { data: historyData } = await supabase.functions.invoke('bot-scheduled-validation', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'history' },
      });

      if (historyData?.jobs) {
        setHistory(historyData.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [session]);

  const handleCreate = async () => {
    if (!session?.access_token) return;

    const emails = formData.emails.split('\n').map(e => e.trim()).filter(e => e);
    
    if (emails.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one email',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.scheduled_at) {
      toast({
        title: 'Error',
        description: 'Please select a scheduled time',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('bot-scheduled-validation', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          name: formData.name || `Validation - ${emails.length} emails`,
          emails,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
        },
      });

      if (error) throw error;

      toast({
        title: 'Job Scheduled',
        description: `Validation scheduled for ${emails.length} emails`,
      });

      setDialogOpen(false);
      setFormData({ name: '', emails: '', scheduled_at: '' });
      fetchJobs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule job';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!session?.access_token) return;

    try {
      const { error } = await supabase.functions.invoke('bot-scheduled-validation', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        method: 'DELETE',
        body: { job_id: jobId },
      });

      if (error) throw error;

      toast({
        title: 'Job Cancelled',
        description: 'The scheduled validation has been cancelled',
      });

      fetchJobs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel job',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-500 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
      case 'cancelled':
        return <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" /> {status === 'cancelled' ? 'Cancelled' : 'Failed'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Scheduled Validations
            </CardTitle>
            <CardDescription>
              Schedule batch email validations to run automatically
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Schedule New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Batch Validation</DialogTitle>
                <DialogDescription>
                  Schedule emails to be validated at a specific time
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Job Name (optional)</Label>
                  <Input
                    placeholder="My validation job"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emails (one per line)</Label>
                  <Textarea
                    placeholder="email1@example.com&#10;email2@example.com"
                    rows={6}
                    value={formData.emails}
                    onChange={(e) => setFormData(prev => ({ ...prev, emails: e.target.value }))}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.emails.split('\n').filter(e => e.trim()).length} emails
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Schedule Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Validation
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheduled Jobs */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Upcoming Jobs ({jobs.length})
          </h3>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No scheduled validations</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{job.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.total_emails} emails • Scheduled for {format(new Date(job.scheduled_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(job.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* History */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            History ({history.length})
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {history.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/20"
                  >
                    <div>
                      <p className="font-medium text-sm">{job.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.valid_emails !== undefined && (
                          <span className="text-green-500">{job.valid_emails} valid</span>
                        )}
                        {job.invalid_emails !== undefined && (
                          <span className="text-destructive ml-2">{job.invalid_emails} invalid</span>
                        )}
                        {job.completed_at && (
                          <span className="ml-2">• {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}</span>
                        )}
                      </p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduledValidations;
