import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import AddMedicationModal from "@/components/AddMedicationModal";
import { Check, Calendar as CalendarIcon, User } from "lucide-react";
import Cookies from "js-cookie";
import { format, isToday, isBefore, startOfDay } from "date-fns";

type Medication = {
  id: number;
  medication_name: string;
  medication_dosage: string;
  medication_frequency: string;
  start_date: string;
  caretaker_name?: string;
  patient_name?: string;
};

const PatientDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [takenRecords, setTakenRecords] = useState<Set<string>>(new Set());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const fetchMedications = async () => {
    try {
      const token = Cookies.get("jwt_token");
      const response = await fetch("https://medicalmanagementsystem-1.onrender.com/medications/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const msg = await response.text();
        if (response.status === 404 || msg.toLowerCase().includes("no medications")) {
          setMedications([]);
          setError("");
          return;
        }
        setError(msg || "Failed to fetch medications");
        return;
      }

      const data = await response.json();
      setMedications(data);
      setError("");
    } catch (err) {
      console.error("Error fetching medications:", err);
      setError("Internal error while fetching medications");
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleMarkTaken = (date: string, medicationName: string) => {
    const key = `${date}|${medicationName}`;
    setTakenRecords((prev) => new Set(prev).add(key));
    console.log(`Marked ${medicationName} as taken on ${date}`);
  };

  const isMedicationTaken = (date: string, medicationName: string) =>
    takenRecords.has(`${date}|${medicationName}`);

  const getStreakCount = () => {
    let streak = 0;
    let currentDate = new Date(today);

    while (
      [...takenRecords].some((entry) =>
        entry.startsWith(format(currentDate, "yyyy-MM-dd"))
      ) &&
      streak < 30
    ) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  const handleDeleteMedication = async (medicationId: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this medication?");
    if (!confirmDelete) return;

    try {
      const token = Cookies.get("jwt_token");
      const response = await fetch(`https://medicalmanagementsystem-1.onrender.com/medications/${medicationId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const msg = await response.text();
        setError(msg || "Failed to delete medication.");
        return;
      }

      const updatedList = await response.json();
      setMedications(updatedList);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Internal error while deleting medication.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}!
            </h2>
            <p className="text-white/90 text-lg">
              Ready to stay on track with your medication?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{getStreakCount()}</div>
            <div className="text-white/80">Day Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">
              {[...takenRecords].some((entry) => entry.startsWith(todayStr)) ? "✓" : "○"}
            </div>
            <div className="text-white/80">Today's Status</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">
              {Math.round((takenRecords.size / (medications.length * 30)) * 100)}%
            </div>
            <div className="text-white/80">Monthly Rate</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                Medication for {format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
              <Button onClick={() => setIsAddModalOpen(true)} className="mt-2">
                + Add New Medication
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {medications.length === 0 && !error ? (
                <p className="text-muted-foreground text-sm">No medications available.</p>
              ) : (
                medications.map((med, index) => {
                  const isTaken = isMedicationTaken(selectedDateStr, med.medication_name);
                  return (
                    <div
                      key={`${med.medication_name}-${med.start_date}-${index}`}
                      className="flex justify-between items-center border p-4 rounded-xl shadow-sm bg-white"
                    >
                      <div>
                        <h3 className="text-lg font-semibold">{med.medication_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Dosage: {med.medication_dosage} | Frequency: {med.medication_frequency}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prescribed by: {med.caretaker_name ?? "Self"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleMarkTaken(selectedDateStr, med.medication_name)}
                          disabled={isTaken}
                        >
                          {isTaken ? "Taken" : "Mark Taken"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingMedication(med);
                            setIsAddModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMedication(med.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Medication Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                modifiersClassNames={{
                  selected: "bg-blue-600 text-white hover:bg-blue-700",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const isTaken = [...takenRecords].some((entry) => entry.startsWith(dateStr));
                    const isPast = isBefore(date, startOfDay(today));
                    const isCurrentDay = isToday(date);

                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {isTaken && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {!isTaken && isPast && !isCurrentDay && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    );
                  },
                }}
              />

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Medication taken</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span>Missed medication</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
        />
      )}
    </div>
  );
};

export default PatientDashboard;
