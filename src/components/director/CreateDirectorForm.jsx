import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Director } from "@/entities/Director";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Check } from "lucide-react";

export default function CreateDirectorForm() {
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "Tournament Director"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create director record
      await Director.create({
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role
      });

      // Invite as admin user
      await base44.users.inviteUser(formData.email, "admin");

      setSubmitStatus("success");
      setFormData({ email: "", full_name: "", role: "Tournament Director" });
      setTimeout(() => setSubmitStatus(""), 3000);
    } catch (error) {
      alert("Error creating director: " + error.message);
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="bg-[#1A1B20] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Create New Director</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g. John Director"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="director@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Director Role</Label>
            <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="Head Director">Head Director</SelectItem>
                <SelectItem value="Tournament Director">Tournament Director</SelectItem>
                <SelectItem value="Assistant Director">Assistant Director</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" />Create Director</>
            )}
          </Button>

          {submitStatus === "success" && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-700/40 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
              <Check className="w-4 h-4" />
              Director created and invitation sent!
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}