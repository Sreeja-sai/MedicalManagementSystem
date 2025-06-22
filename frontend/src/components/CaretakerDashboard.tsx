import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Users, Bell, Calendar as CalendarIcon, Mail, Pencil, Trash, Plus } from "lucide-react";
import NotificationSettings from "./NotificationSettings";
import AddMedicationModal from "@/components/AddMedicationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Cookies from "js-cookie";

interface Medication {
  id: number;
  medication_name: string;
  medication_dosage: string;
  medication_frequency: string;
  start_date: string;
  patient_name?: string;
  patient_id?: number;
}

const CaretakerDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMedication, setDeletingMedication] = useState<Medication | null>(null);

  const patientName = medications[0]?.patient_name || "Patient";
  const adherenceRate = 85;
  const currentStreak = 5;
  const missedDoses = 3;

  const fetchMedications = async () => {
    try {
      const token = Cookies.get("jwt_token");
      const response = await fetch("http://localhost:3000/medications/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const msg = await response.text();
        setError(msg || "Failed to fetch medications");
        return;
      }
      const data = await response.json();
      setMedications(data);
    } catch (err) {
      console.error("Error fetching medications:", err);
      setError("Internal error while fetching medications");
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleSendReminderEmail = () => {
    alert("Reminder email sent to " + patientName);
  };

  const handleConfigureNotifications = () => {
    setActiveTab("notifications");
  };

  const handleViewCalendar = () => {
    setActiveTab("calendar");
  };

  const handleEdit = (med: Medication) => {
    setEditingMedication(med);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (med: Medication) => {
    setDeletingMedication(med);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingMedication) return;
    try {
      const token = Cookies.get("jwt_token");
      const response = await fetch(`http://localhost:3000/medications/${deletingMedication.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const msg = await response.text();
        setError(msg || "Failed to delete medication");
        return;
      }
      const updatedList = await response.json();
      setMedications(updatedList);
      setShowDeleteModal(false);
      setDeletingMedication(null);
    } catch (err) {
      console.error("Error deleting medication:", err);
      setError("Internal error while deleting medication");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Caretaker Dashboard</h2>
            <p className="text-white/90 text-lg">Monitoring {patientName}'s medication adherence</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{adherenceRate}%</div>
            <div className="text-white/80">Adherence Rate</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-white/80">Current Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{missedDoses}</div>
            <div className="text-white/80">Missed This Month</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{medications.length}</div>
            <div className="text-white/80">Total Medications</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Today's Status
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Medication
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {medications.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center">No medications available.</p>
                ) : (
                  medications.map((med) => (
                    <div key={med.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{med.medication_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {med.medication_dosage} | {med.medication_frequency}
                        </p>
                        {med.patient_name && (
                          <p className="text-xs text-muted-foreground italic">Patient: {med.patient_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(med)}>
                          <Pencil className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(med)}>
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={handleSendReminderEmail}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder Email
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleConfigureNotifications}>
                  <Bell className="w-4 h-4 mr-2" />
                  Configure Notifications
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleViewCalendar}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  View Full Calendar
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Adherence Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{adherenceRate}%</span>
                </div>
                <Progress value={adherenceRate} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Medication Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">(Activity tracking coming soon...)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Medication Calendar Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isAddModalOpen && (
        <AddMedicationModal
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingMedication(null);
          }}
          onMedicationAdded={() => {
            setIsAddModalOpen(false);
            setEditingMedication(null);
            fetchMedications();
          }}
          editingMedication={editingMedication}
          isCaretaker={true}
        />
      )}

      <Dialog open={showDeleteModal} onOpenChange={() => setShowDeleteModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this medication?</p>
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaretakerDashboard;
