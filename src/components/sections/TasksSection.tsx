import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AdaptiveSelect } from "@/components/adaptive";
import { CheckCircle, Clock, RotateCcw, Trash2, Plus, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeError } from "@/lib/errorHandler";
import { addDays, addWeeks, addMonths, format, nextMonday, startOfMonth, addMonths as addMonthsFns, subDays } from 'date-fns';
import { APP_REFRESH_EVENT } from "@/hooks/useAppRefresh";

// Helper function to calculate next due date for recurring tasks
const calculateNextDueDate = (currentDueDate: string | null, recurrenceType: string): string => {
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  
  switch (recurrenceType) {
    case 'daily':
      return format(addDays(baseDate, 1), 'yyyy-MM-dd');
    case 'weekly':
      return format(addWeeks(baseDate, 1), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(baseDate, 1), 'yyyy-MM-dd');
    default:
      return format(addDays(baseDate, 1), 'yyyy-MM-dd');
  }
};

// Helper function to calculate when the next recurring task should become visible
const calculateNextVisibleFrom = (recurrenceType: string): string => {
  const today = new Date();
  
  switch (recurrenceType) {
    case 'daily':
      return format(addDays(today, 1), 'yyyy-MM-dd');
    case 'weekly':
      // Next Monday
      return format(nextMonday(today), 'yyyy-MM-dd');
    case 'monthly':
      // 1st of next month
      return format(startOfMonth(addMonthsFns(today, 1)), 'yyyy-MM-dd');
    default:
      return format(addDays(today, 1), 'yyyy-MM-dd');
  }
};

// Get user-friendly label for when task will appear - now uses translation
const getVisibleFromLabel = (recurrenceType: string, t: (key: string) => string): string => {
  switch (recurrenceType) {
    case 'daily':
      return t('sectionsUI.tasks.visibleFrom.tomorrow');
    case 'weekly':
      return t('sectionsUI.tasks.visibleFrom.nextMonday');
    case 'monthly':
      return t('sectionsUI.tasks.visibleFrom.firstOfMonth');
    default:
      return t('sectionsUI.tasks.visibleFrom.tomorrow');
  }
};


interface TasksSectionProps {
  familyId: string | undefined;
  userRole: string;
}

export const TasksSection = ({ familyId, userRole }: TasksSectionProps) => {
  const { t } = useTranslation();
  console.log('[TasksSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {t('sectionsUI.tasks.emptyStates.noFamily')}
        </p>
      </div>
    );
  }

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
    is_recurring: false,
    recurrence_type: '' as '' | 'daily' | 'weekly' | 'monthly'
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const loadData = async () => {
      if (cancelled || !familyId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            abortController.abort();
            setLoading(false);
            console.warn("⏱️ [TasksSection] load timeout after 8s");
          }
        }, 5000);

        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setCurrentUserId(user?.id || null);

        if (!cancelled) {
          const { data, error } = await supabase
            .from('user_memberships')
            .select(`user_id, role, profiles!inner(full_name)`)
            .eq('family_id', familyId)
            .eq('role', 'carer')
            .abortSignal(abortController.signal);

          if (!error && data && !cancelled) {
            setTeamMembers(data as any);
          }
        }

        if (!cancelled) {
          await loadTasks(abortController.signal);
        }
      } catch (error: any) {
        if (!cancelled && error.name !== 'AbortError') {
          const sanitized = sanitizeError(error);
          toast({
            title: sanitized.title,
            description: sanitized.description,
            variant: "destructive"
          });
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    // Listen for app-wide refresh events
    const handleAppRefresh = () => {
      if (!cancelled && familyId) {
        console.log('[TasksSection] App refresh event received');
        loadTasks();
      }
    };

    window.addEventListener(APP_REFRESH_EVENT, handleAppRefresh);

    return () => {
      cancelled = true;
      abortController.abort();
      window.removeEventListener(APP_REFRESH_EVENT, handleAppRefresh);
    };
  }, [familyId]);


  const canEdit = userRole !== 'family_viewer';
  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';

  const loadTasks = async (signal?: AbortSignal) => {
    try {
      if (!familyId) {
        console.error('No familyId provided to loadTasks');
        return;
      }
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      
      // Fetch active tasks (not completed, visible today)
      const { data: activeTasks, error: activeError } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('completed', false)
        .eq('is_archived', false)
        .lte('visible_from', today)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (activeError) throw activeError;

      // Fetch completed tasks from last 7 days (for Done tab)
      const { data: completedTasks, error: completedError } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('completed', true)
        .gte('updated_at', sevenDaysAgo)
        .order('updated_at', { ascending: false })
        .abortSignal(signal);

      if (completedError) throw completedError;

      const allTasks = [...(activeTasks || []), ...(completedTasks || [])];

      if (allTasks.length === 0) {
        console.warn("⚠️ [TasksSection] Empty result - likely RLS restriction or sync delay");
      }

      // Get profile names for users using safe profile lookup
      const tasksWithProfiles = await Promise.all(
        allTasks.map(async (task) => {
          let assignedProfile = null;
          let createdProfile = null;

          try {
            if (task.assigned_to) {
              const { data: assignedData } = await supabase
                .rpc('get_profile_safe');
              assignedProfile = assignedData && assignedData.length > 0 ? 
                { full_name: assignedData[0].full_name || 'Unknown User' } : null;
            }
          } catch (profileError) {
            console.warn('Failed to load assigned profile:', profileError);
          }

          try {
            if (task.created_by) {
              const { data: createdData } = await supabase
                .rpc('get_profile_safe');
              createdProfile = createdData && createdData.length > 0 ? 
                { full_name: createdData[0].full_name || 'Unknown User' } : null;
            }
          } catch (profileError) {
            console.warn('Failed to load created profile:', profileError);
          }

          return {
            ...task,
            assigned_profile: assignedProfile,
            created_profile: createdProfile
          };
        })
      );

      setTasks(tasksWithProfiles);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading tasks:', error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      }
    }
  };

  const markTaskComplete = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const isRecurring = !!(task.is_recurring && task.recurrence_type);
      
      // If recurring task, create next instance
      if (isRecurring) {
        const nextDueDate = calculateNextDueDate(task.due_date, task.recurrence_type);
        const nextVisibleFrom = calculateNextVisibleFrom(task.recurrence_type);
        
        // Call the safe RPC function that includes duplicate check
        const { data: result, error: rpcError } = await supabase.rpc(
          'create_recurring_task_instance',
          {
            _parent_task_id: task.parent_task_id || task.id,
            _family_id: familyId,
            _title: task.title,
            _description: task.description,
            _assigned_to: task.assigned_to,
            _created_by: currentUserId,
            _recurrence_type: task.recurrence_type,
            _next_due_date: nextDueDate,
            _visible_from: nextVisibleFrom
          }
        );
        
        if (rpcError) {
          console.error('Error creating next recurring task:', rpcError);
        } else if (result) {
          const typedResult = result as { success: boolean; reason?: string; visible_from?: string };
          if (!typedResult.success) {
            console.log('Skipped creating duplicate:', typedResult.reason);
          } else {
            console.log('Created next instance, visible from:', typedResult.visible_from);
          }
        }
      }
      
      // Mark current task complete - keep is_archived false so it shows in Done tab
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true,
          is_archived: false
        })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();

      const toastMessage = isRecurring 
        ? t('sectionsUI.tasks.toast.completedRecurring', { nextOccurrence: getVisibleFromLabel(task.recurrence_type, t) })
        : t('sectionsUI.tasks.toast.movedToDone');

      toast({
        title: "Task completed",
        description: toastMessage
      });
    } catch (error) {
      console.error('Error marking task complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark task as complete",
        variant: "destructive"
      });
    }
  };

  const reopenTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: false,
          is_archived: false
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Reopened",
        description: "Task has been moved back to Active",
      });

      loadTasks();
    } catch (error) {
      console.error('Error reopening task:', error);
      toast({
        title: "Error",
        description: "Failed to reopen task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Deleted",
        description: "Task has been deleted",
      });

      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    // Verify user is authenticated before attempting save
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please wait for authentication to complete",
        variant: "destructive",
      });
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('tasks')
        .insert([{
          family_id: familyId,
          title: newTask.title,
          description: newTask.description || null,
          due_date: newTask.due_date || null,
          assigned_to: newTask.assigned_to || null,
          created_by: currentUserId,
          is_recurring: newTask.is_recurring,
          recurrence_type: newTask.is_recurring ? newTask.recurrence_type : null,
          visible_from: today
        }]);

      if (error) throw error;

      setNewTask({
        title: '',
        description: '',
        due_date: '',
        assigned_to: '',
        is_recurring: false,
        recurrence_type: ''
      });
      setShowAddForm(false);
      loadTasks();
      
      toast({
        title: "Task Created",
        description: newTask.is_recurring 
          ? `Recurring ${newTask.recurrence_type} task created` 
          : "Task has been created successfully",
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const activeTasks = tasks.filter(task => !task.completed);
  const doneTasks = tasks.filter(task => task.completed);

  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to manage tasks.
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4" />
              Loading tasks…
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      {/* Add Task Form */}
      {showAddForm && familyId && canEdit && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="w-full min-h-[80px] p-3 border rounded-md resize-none"
              placeholder="Task description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Due Date (optional)</label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Assign To (optional)</label>
                <AdaptiveSelect
                  value={newTask.assigned_to}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, assigned_to: value }))}
                  placeholder="Select team member"
                  title="Assign To"
                  options={teamMembers.map((member) => ({
                    value: member.user_id,
                    label: member.profiles.full_name || 'Unnamed User'
                  }))}
                />
              </div>
            </div>
            
            {/* Recurring Task Options */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_recurring"
                  checked={newTask.is_recurring}
                  onCheckedChange={(checked) => setNewTask(prev => ({ 
                    ...prev, 
                    is_recurring: checked === true,
                    recurrence_type: checked === true ? 'daily' : ''
                  }))}
                />
                <label htmlFor="is_recurring" className="text-sm font-medium cursor-pointer">
                  Make this a recurring task
                </label>
              </div>
              
              {newTask.is_recurring && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Repeat</label>
                  <AdaptiveSelect
                    value={newTask.recurrence_type}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, recurrence_type: value as 'daily' | 'weekly' | 'monthly' }))}
                    placeholder="Select frequency"
                    title="Repeat Frequency"
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' }
                    ]}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When completed, a new task will be created for the next {newTask.recurrence_type === 'daily' ? 'day' : newTask.recurrence_type === 'weekly' ? 'week' : 'month'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddTask} 
                disabled={!newTask.title.trim() || !currentUserId}
                className="h-12 md:h-10 px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
              >
                Create Task
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                className="h-12 md:h-10 px-4 py-3 md:px-6 md:py-2 min-h-[44px]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Tasks</h3>
        {familyId && canEdit && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="h-10 px-4 text-sm min-h-[44px] md:min-h-[40px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {!showAddForm && (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Active</span>
              <span>({activeTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="done" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Done</span>
              <span>({doneTasks.length})</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Tasks</CardTitle>
                  <CardDescription>Tasks that need to be completed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg">
                    <div className="task-content">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        {task.is_recurring && (
                          <Badge variant="secondary" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {task.recurrence_type}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {task.assigned_profile && (
                          <span>Assigned to: {task.assigned_profile.full_name}</span>
                        )}
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                       <div className="flex gap-2 flex-wrap mt-2">
                         {familyId && canEdit && (
                           <Button 
                             size="sm" 
                             onClick={() => markTaskComplete(task.id)}
                             className="bg-green-500 hover:bg-green-600 h-auto px-2 py-1 text-xs"
                           >
                             <CheckCircle className="h-3 w-3 mr-1" />
                             Mark Done
                           </Button>
                         )}
                         {familyId && canEdit && (
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => deleteTask(task.id)}
                             className="h-auto px-2 py-1 text-xs"
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         )}
                       </div>
                  </div>
                ))}
                {activeTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active tasks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="done" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>Tasks completed in the last 7 days (auto-deleted after 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {doneTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground line-through">{task.title}</span>
                          {task.is_recurring && (
                            <Badge variant="secondary" className="text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {task.recurrence_type}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {task.updated_at && (
                            <span>Completed: {new Date(task.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    </div>
                    {/* Admin actions: Re-open and Delete */}
                    {isAdmin && (
                      <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => reopenTask(task.id)}
                          className="h-auto px-2 py-1 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Re-open
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteTask(task.id)}
                          className="h-auto px-2 py-1 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {doneTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed tasks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

    </div>
  );
};
