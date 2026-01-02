import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Save, X, AlertCircle, Loader2, FileWarning, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiskAssessmentForm } from "@/components/forms/RiskAssessmentForm";
import { RiskAssessmentCard } from "@/components/RiskAssessmentCard";
import { RiskAssessmentViewer } from "@/components/RiskAssessmentViewer";

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface RiskAssessment {
  id: string;
  title: string;
  activity: string;
  setting: string;
  main_hazards: string;
  location: string;
  assessment_content: string;
  residual_risk_level: string | null;
  is_approved: boolean;
  next_review_date: string | null;
  created_at: string;
}

interface KeyInformationSectionProps {
  familyId: string;
  userRole: string;
}

export const KeyInformationSection = ({ familyId, userRole }: KeyInformationSectionProps) => {
  console.log('[KeyInformationSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect to a family to access key information.
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const [keyInfo, setKeyInfo] = useState({
    medical_history: '',
    house_details: '',
    car_policies: '',
    additional_info: '',
    emergency_contacts: [] as EmergencyContact[]
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);

  // Risk Assessment state
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [activity, setActivity] = useState('');
  const [setting, setSetting] = useState('');
  const [mainHazards, setMainHazards] = useState('');
  const [location, setLocation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<{
    title: string;
    content: string;
    residualRiskLevel: string;
  } | null>(null);
  const [viewingAssessment, setViewingAssessment] = useState<RiskAssessment | null>(null);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const canEdit = userRole === 'family_admin' || userRole === 'disabled_person';
  const canDelete = userRole === 'family_admin' || userRole === 'disabled_person';

  const loadKeyInformation = async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('key_information')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setKeyInfo({
          medical_history: data.medical_history || '',
          house_details: data.house_details || '',
          car_policies: data.car_policies || '',
          additional_info: data.additional_info || '',
          emergency_contacts: (data.emergency_contacts as unknown as EmergencyContact[]) || []
        });
      } else {
        setKeyInfo({
          medical_history: '',
          house_details: '',
          car_policies: '',
          additional_info: '',
          emergency_contacts: []
        });
      }
    } catch (error) {
      console.error('Error loading key information:', error);
      toast({
        title: "Error",
        description: "Failed to load key information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRiskAssessments = async () => {
    if (!familyId) {
      setLoadingAssessments(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiskAssessments(data || []);
    } catch (error) {
      console.error('Error loading risk assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load risk assessments",
        variant: "destructive"
      });
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleSave = async () => {
    if (!familyId) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('key_information')
        .upsert({
          family_id: familyId,
          medical_history: keyInfo.medical_history,
          house_details: keyInfo.house_details,
          car_policies: keyInfo.car_policies,
          additional_info: keyInfo.additional_info,
          emergency_contacts: keyInfo.emergency_contacts as any,
          last_updated_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'family_id'
        });

      if (error) throw error;
      
      toast({
        title: "Saved",
        description: "Key information has been saved successfully"
      });
      setEditing(false);
    } catch (error) {
      console.error('Error saving key information:', error);
      toast({
        title: "Error",
        description: "Failed to save key information",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addEmergencyContact = () => {
    setKeyInfo(prev => ({
      ...prev,
      emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '', relationship: '' }]
    }));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setKeyInfo(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setKeyInfo(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const handleGenerateAssessment = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-risk-assessment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity,
          setting,
          mainHazards,
          location,
          familyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate assessment');
      }

      const data = await response.json();
      setGeneratedAssessment({
        title: data.title,
        content: data.assessmentContent,
        residualRiskLevel: data.residualRiskLevel
      });
      
      toast({
        title: "Assessment Generated",
        description: "Review and save the assessment below"
      });
    } catch (error) {
      console.error('Error generating assessment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate assessment",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedAssessment = async (updates: {
    title: string;
    content: string;
    residualRiskLevel: string;
    isApproved: boolean;
    nextReviewDate: string | null;
  }) => {
    setIsSavingAssessment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('risk_assessments')
        .insert({
          family_id: familyId,
          created_by: user.id,
          activity,
          setting,
          main_hazards: mainHazards,
          location,
          title: updates.title,
          assessment_content: updates.content,
          residual_risk_level: updates.residualRiskLevel,
          is_approved: updates.isApproved,
          approved_by: updates.isApproved ? user.id : null,
          approved_at: updates.isApproved ? new Date().toISOString() : null,
          next_review_date: updates.nextReviewDate
        });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Risk assessment saved successfully"
      });

      // Reset form
      setActivity('');
      setSetting('');
      setMainHazards('');
      setLocation('');
      setGeneratedAssessment(null);
      setShowCreateForm(false);
      
      // Reload assessments
      loadRiskAssessments();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save risk assessment",
        variant: "destructive"
      });
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleUpdateAssessment = async (updates: {
    title: string;
    content: string;
    residualRiskLevel: string;
    isApproved: boolean;
    nextReviewDate: string | null;
  }) => {
    if (!viewingAssessment) return;
    
    setIsSavingAssessment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        title: updates.title,
        assessment_content: updates.content,
        residual_risk_level: updates.residualRiskLevel,
        is_approved: updates.isApproved,
        next_review_date: updates.nextReviewDate,
        updated_at: new Date().toISOString()
      };

      // If newly approved, set approval fields
      if (updates.isApproved && !viewingAssessment.is_approved) {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('risk_assessments')
        .update(updateData)
        .eq('id', viewingAssessment.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Risk assessment updated successfully"
      });

      // Update local state
      setViewingAssessment({
        ...viewingAssessment,
        title: updates.title,
        assessment_content: updates.content,
        residual_risk_level: updates.residualRiskLevel,
        is_approved: updates.isApproved,
        next_review_date: updates.nextReviewDate
      });
      
      loadRiskAssessments();
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast({
        title: "Error",
        description: "Failed to update risk assessment",
        variant: "destructive"
      });
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this risk assessment?')) return;
    
    try {
      const { error } = await supabase
        .from('risk_assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Risk assessment deleted"
      });
      
      loadRiskAssessments();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to delete risk assessment",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        console.warn("⏱️ [KeyInformationSection] load timeout after 8s");
      }
    }, 8000);

    loadKeyInformation()
      .finally(() => {
        if (!cancelled) setLoading(false);
        clearTimeout(timeout);
      });

    loadRiskAssessments();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [familyId]);

  // Show refresh button after 5 seconds of loading
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    if (loading) {
      refreshTimer = setTimeout(() => {
        setShowRefresh(true);
      }, 5000);
    } else {
      setShowRefresh(false);
    }
    return () => clearTimeout(refreshTimer);
  }, [loading]);

  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to view key information.
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
              Loading key information…
            </div>
            {showRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Force Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="key-info" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="key-info" className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Key Information</span>
        </TabsTrigger>
        <TabsTrigger value="risk-assessments" className="flex items-center gap-2">
          <FileWarning className="h-4 w-4" />
          <span className="hidden sm:inline">Risk Assessments</span>
        </TabsTrigger>
      </TabsList>

      {/* Key Information Tab */}
      <TabsContent value="key-info" className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Key Information</h3>
          {canEdit && !editing && (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Medical History</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  placeholder="Enter medical history, conditions, allergies, etc."
                  value={keyInfo.medical_history}
                  onChange={(e) => setKeyInfo(prev => ({ ...prev, medical_history: e.target.value }))}
                  rows={4}
                />
              ) : (
                <p className="text-sm">
                  {keyInfo.medical_history || 'No medical history recorded'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">House Details</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  placeholder="Enter access codes, key locations, wifi passwords, etc."
                  value={keyInfo.house_details}
                  onChange={(e) => setKeyInfo(prev => ({ ...prev, house_details: e.target.value }))}
                  rows={4}
                />
              ) : (
                <p className="text-sm">
                  {keyInfo.house_details || 'No house details recorded'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Car Policies</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  placeholder="Enter car usage policies, insurance details, etc."
                  value={keyInfo.car_policies}
                  onChange={(e) => setKeyInfo(prev => ({ ...prev, car_policies: e.target.value }))}
                  rows={3}
                />
              ) : (
                <p className="text-sm">
                  {keyInfo.car_policies || 'No car policies recorded'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Emergency Contacts</CardTitle>
                {editing && (
                  <Button onClick={addEmergencyContact} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {keyInfo.emergency_contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emergency contacts recorded</p>
              ) : (
                <div className="space-y-4">
                  {keyInfo.emergency_contacts.map((contact, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-2">
                      {editing ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Name</Label>
                            <Input
                              placeholder="Name"
                              value={contact.name}
                              onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Phone</Label>
                            <Input
                              placeholder="Phone"
                              value={contact.phone}
                              onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Relationship</Label>
                              <Input
                                placeholder="Relationship"
                                value={contact.relationship}
                                onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={() => removeEmergencyContact(index)}
                              variant="outline"
                              size="sm"
                              className="mt-5"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                          <p className="text-sm">{contact.relationship}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  placeholder="Enter any other important information..."
                  value={keyInfo.additional_info}
                  onChange={(e) => setKeyInfo(prev => ({ ...prev, additional_info: e.target.value }))}
                  rows={3}
                />
              ) : (
                <p className="text-sm">
                  {keyInfo.additional_info || 'No additional information recorded'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Risk Assessments Tab */}
      <TabsContent value="risk-assessments" className="space-y-6">
        {viewingAssessment ? (
          <RiskAssessmentViewer
            title={viewingAssessment.title}
            content={viewingAssessment.assessment_content}
            residualRiskLevel={viewingAssessment.residual_risk_level || 'medium'}
            isApproved={viewingAssessment.is_approved}
            nextReviewDate={viewingAssessment.next_review_date}
            onBack={() => setViewingAssessment(null)}
            onSave={handleUpdateAssessment}
            canEdit={canEdit}
            isSaving={isSavingAssessment}
          />
        ) : generatedAssessment ? (
          <RiskAssessmentViewer
            title={generatedAssessment.title}
            content={generatedAssessment.content}
            residualRiskLevel={generatedAssessment.residualRiskLevel}
            isApproved={false}
            nextReviewDate={null}
            onBack={() => setGeneratedAssessment(null)}
            onSave={handleSaveGeneratedAssessment}
            canEdit={true}
            isSaving={isSavingAssessment}
          />
        ) : showCreateForm ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Create Risk Assessment</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RiskAssessmentForm
                activity={activity}
                setting={setting}
                mainHazards={mainHazards}
                location={location}
                onActivityChange={setActivity}
                onSettingChange={setSetting}
                onMainHazardsChange={setMainHazards}
                onLocationChange={setLocation}
                onGenerate={handleGenerateAssessment}
                isGenerating={isGenerating}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-lg font-semibold">Risk Assessments</h3>
              <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            </div>

            <Alert>
              <FileWarning className="h-4 w-4" />
              <AlertDescription>
                AI-generated risk assessments use your care data (notes, medications, medical history) to create tailored assessments. All assessments must be reviewed and approved by a responsible person.
              </AlertDescription>
            </Alert>

            {loadingAssessments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : riskAssessments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No risk assessments yet.</p>
                  <p className="text-sm mt-1">Create your first AI-powered risk assessment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {riskAssessments.map((assessment) => (
                  <RiskAssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    onView={(id) => {
                      const found = riskAssessments.find(a => a.id === id);
                      if (found) setViewingAssessment(found);
                    }}
                    onDelete={handleDeleteAssessment}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};
