import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Cookies from "js-cookie";

interface AddMedicationModalProps {
  open?: boolean;
  onClose: () => void;
  onMedicationAdded: () => void;
  editingMedication?: {
    id?: number;
    medication_name: string;
    medication_dosage: string;
    medication_frequency: string;
  } | null;
  isCaretaker?: boolean;
}

const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  open = true,
  onClose,
  onMedicationAdded,
  editingMedication,
  isCaretaker = false,
}) => {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingMedication) {
      setName(editingMedication.medication_name);
      setDosage(editingMedication.medication_dosage);
      setFrequency(editingMedication.medication_frequency);
    } else {
      setName("");
      setDosage("");
      setFrequency("");
    }
  }, [editingMedication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !dosage || !frequency || (isCaretaker && !editingMedication && !patientId)) {
      setError("All fields are required.");
      return;
    }

    try {
      setLoading(true);
      const token = Cookies.get("jwt_token");

      const isEdit = editingMedication && editingMedication.id;
      const url = isEdit
        ? `http://localhost:3000/medications/${editingMedication.id}`
        : "http://localhost:3000/medications/";
      const method = isEdit ? "PUT" : "POST";

      const body = isEdit
        ? {
            medication_name: name,
            medication_dosage: dosage,
            medication_frequency: frequency,
          }
        : {
            name,
            dosage,
            frequency,
            ...(isCaretaker ? { patientId: Number(patientId) } : {}),
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const msg = await response.text();
        setError(msg || "Failed to save medication.");
        return;
      }

      onMedicationAdded();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingMedication ? "Edit Medication" : "Add New Medication"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Medication Name</Label>
            <Input
              id="name"
              placeholder="e.g. Paracetamol"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="dosage">Dosage</Label>
            <Input
              id="dosage"
              placeholder="e.g. 500mg"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Input
              id="frequency"
              placeholder="e.g. Twice a day"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            />
          </div>

          {isCaretaker && !editingMedication && (
            <div>
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                placeholder="Enter Patient ID"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">* {error}</p>}

          <Button type="submit" disabled={loading}>
            {loading
              ? editingMedication
                ? "Updating..."
                : "Adding..."
              : editingMedication
              ? "Update Medication"
              : "Add Medication"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMedicationModal;
