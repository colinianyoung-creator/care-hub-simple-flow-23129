import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertTriangle, RotateCcw, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeError } from "@/lib/errorHandler";
import { Alert, AlertDescription } from "@/components/ui/alert";


interface TasksSectionProps {
  familyId: string | undefined;
  userRole: string;
}

export const TasksSection = ({ familyId, userRole }: TasksSectionProps) => {
  console.log('[TasksSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Create your personal care space or join a family to start tracking tasks.
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
    assigned_to: ''
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
            .select(`user_id, profiles!inner(full_name)`)
            .eq('family_id', familyId)
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

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [familyId]);


  const loadTasks = async (signal?: AbortSignal) => {
    try {
      if (!familyId) {
        console.error('No familyId provided to loadTasks');
        return;
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;

      if (!error && data?.length === 0) {
        console.warn("⚠️ [TasksSection] Empty result - likely RLS restriction or sync delay");
      }

      // Get profile names for users using safe profile lookup
      const tasksWithProfiles = await Promise.all(
        (data || []).map(async (task) => {
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
      const { data: { user } } = await supabase.auth.getUser();
      const task = tasks.find(t => t.id === taskId);
      
      // If current user is admin OR task creator, skip review (archive immediately)
      const skipReview = userRole === 'family_admin' || 
                         userRole === 'disabled_person' ||
                         task?.created_by === user?.id;
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true,
          is_archived: skipReview // Archive immediately if admin completes it
        })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();

      toast({
        title: "Task completed",
        description: skipReview ? "Task moved to Done tab" : "Task sent for review"
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

  const approveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_archived: true })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();

      toast({
        title: "Task approved",
        description: "Task has been approved and archived"
      });
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        title: "Error",
        description: "Failed to approve task",
        variant: "destructive"
      });
    }
  };

  const reopenTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: false
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Reopened",
        description: "Task has been reopened",
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
      const { error } = await supabase
        .from('tasks')
        .insert([{
          family_id: familyId,
          title: newTask.title,
          description: newTask.description || null,
          due_date: newTask.due_date || null,
          assigned_to: newTask.assigned_to || null,
          created_by: currentUserId
        }]);

      if (error) throw error;

      setNewTask({
        title: '',
        description: '',
        due_date: '',
        assigned_to: ''
      });
      setShowAddForm(false);
      loadTasks();
      
      toast({
        title: "Task Created",
        description: "Task has been created successfully",
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
  const awaitingReviewTasks = tasks.filter(task => task.completed && !task.is_archived);
  const completedTasks = tasks.filter(task => task.completed);

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
      {showAddForm && familyId && (
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Due Date (optional)</label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Assign To (optional)</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profiles.full_name || 'Unnamed User'}
                    </option>
                  ))}
                </select>
              </div>
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
        {familyId && (
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Active</span>
              <span>({activeTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Review</span>
              <span>({awaitingReviewTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-1 text-xs md:text-sm px-2 py-2">
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Done</span>
              <span>({completedTasks.length})</span>
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
                      <div className="font-medium">{task.title}</div>
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
                      {familyId && (
                        <Button 
                          size="sm" 
                          onClick={() => markTaskComplete(task.id)}
                          className="bg-green-500 hover:bg-green-600 h-auto px-2 py-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Done
                        </Button>
                      )}
                      {familyId && (
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

        <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tasks Awaiting Review</CardTitle>
                <CardDescription>Tasks marked as complete by carers, awaiting your approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {awaitingReviewTasks.map((task) => (
                    <div key={task.id} className="p-4 border rounded-lg bg-yellow-50">
                      <div className="task-content">
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {task.assigned_profile && (
                            <span>Completed by: {task.assigned_profile.full_name}</span>
                          )}
                          {task.completed_at && (
                            <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Button 
                          size="sm" 
                          onClick={() => approveTask(task.id)}
                          className="bg-green-500 hover:bg-green-600 h-auto px-2 py-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => reopenTask(task.id)}
                          className="h-auto px-2 py-1 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Re-open
                        </Button>
                      </div>
                    </div>
                  ))}
                  {awaitingReviewTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks awaiting review
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>Recently completed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium text-muted-foreground">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {task.completed_at && (
                          <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>
                ))}
                {completedTasks.length === 0 && (
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
