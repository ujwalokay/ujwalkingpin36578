import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceConfigCard } from "@/components/DeviceConfigCard";
import { PricingTable } from "@/components/PricingTable";
import { HappyHoursPricing } from "@/components/HappyHoursPricing";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

const DEFAULT_PC_CONFIG = {
  count: 10,
  seats: Array.from({ length: 10 }, (_, i) => ({ name: `PC-${i + 1}`, visible: true }))
};

const DEFAULT_PS5_CONFIG = {
  count: 8,
  seats: Array.from({ length: 8 }, (_, i) => ({ name: `PS5-${i + 1}`, visible: true }))
};

const DEFAULT_PC_PRICING = [
  { duration: "1 Hour", price: 50 },
  { duration: "2 Hours", price: 90 },
  { duration: "3 Hours", price: 120 }
];

const DEFAULT_PS5_PRICING = [
  { duration: "1 Hour", price: 80 },
  { duration: "2 Hours", price: 150 },
  { duration: "3 Hours", price: 200 }
];

const DEFAULT_PC_TIMESLOTS = [
  { startTime: "11:00", endTime: "14:00" }
];

const DEFAULT_PS5_TIMESLOTS = [
  { startTime: "11:00", endTime: "14:00" }
];

const DEFAULT_PC_HAPPY_PRICING = [
  { duration: "1 Hour", price: 40 },
  { duration: "2 Hours", price: 70 }
];

const DEFAULT_PS5_HAPPY_PRICING = [
  { duration: "1 Hour", price: 60 },
  { duration: "2 Hours", price: 110 }
];

export default function Settings() {
  const { toast } = useToast();
  
  const [pcConfig, setPcConfig] = useState(DEFAULT_PC_CONFIG);
  const [ps5Config, setPs5Config] = useState(DEFAULT_PS5_CONFIG);
  const [pcPricing, setPcPricing] = useState(DEFAULT_PC_PRICING);
  const [ps5Pricing, setPs5Pricing] = useState(DEFAULT_PS5_PRICING);
  const [pcHappyHoursEnabled, setPcHappyHoursEnabled] = useState(true);
  const [ps5HappyHoursEnabled, setPs5HappyHoursEnabled] = useState(true);
  const [pcTimeSlots, setPcTimeSlots] = useState<TimeSlot[]>(DEFAULT_PC_TIMESLOTS);
  const [ps5TimeSlots, setPs5TimeSlots] = useState<TimeSlot[]>(DEFAULT_PS5_TIMESLOTS);
  const [pcHappyHoursPricing, setPcHappyHoursPricing] = useState(DEFAULT_PC_HAPPY_PRICING);
  const [ps5HappyHoursPricing, setPs5HappyHoursPricing] = useState(DEFAULT_PS5_HAPPY_PRICING);

  const handleSaveAll = async () => {
    toast({
      title: "Settings Saved",
      description: "All configurations have been saved successfully!",
    });
  };

  const handlePcCountChange = (newCount: number) => {
    const newSeats = Array.from({ length: newCount }, (_, i) => ({
      name: `PC-${i + 1}`,
      visible: i < pcConfig.seats.length ? pcConfig.seats[i].visible : true,
    }));
    setPcConfig({ count: newCount, seats: newSeats });
  };

  const handlePs5CountChange = (newCount: number) => {
    const newSeats = Array.from({ length: newCount }, (_, i) => ({
      name: `PS5-${i + 1}`,
      visible: i < ps5Config.seats.length ? ps5Config.seats[i].visible : true,
    }));
    setPs5Config({ count: newCount, seats: newSeats });
  };

  const handlePcToggleVisibility = (seatName: string) => {
    setPcConfig((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => (s.name === seatName ? { ...s, visible: !s.visible } : s)),
    }));
  };

  const handlePs5ToggleVisibility = (seatName: string) => {
    setPs5Config((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => (s.name === seatName ? { ...s, visible: !s.visible } : s)),
    }));
  };

  const addPcTimeSlot = () => {
    setPcTimeSlots([...pcTimeSlots, { startTime: "11:00", endTime: "14:00" }]);
  };

  const addPs5TimeSlot = () => {
    setPs5TimeSlots([...ps5TimeSlots, { startTime: "11:00", endTime: "14:00" }]);
  };

  const removePcTimeSlot = (index: number) => {
    setPcTimeSlots(pcTimeSlots.filter((_, i) => i !== index));
  };

  const removePs5TimeSlot = (index: number) => {
    setPs5TimeSlots(ps5TimeSlots.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Configure devices and pricing</p>
        </div>
        <Button onClick={handleSaveAll} data-testid="button-save-changes">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Device Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <DeviceConfigCard
            title="PC"
            description={`Configure PC devices`}
            count={pcConfig.count}
            onCountChange={handlePcCountChange}
            seats={pcConfig.seats}
            onToggleVisibility={handlePcToggleVisibility}
          />
          <DeviceConfigCard
            title="PS5"
            description={`Configure PS5 devices`}
            count={ps5Config.count}
            onCountChange={handlePs5CountChange}
            seats={ps5Config.seats}
            onToggleVisibility={handlePs5ToggleVisibility}
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Pricing Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <PricingTable category="PC" slots={pcPricing} onUpdateSlots={setPcPricing} />
          <PricingTable category="PS5" slots={ps5Pricing} onUpdateSlots={setPs5Pricing} />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Happy Hours Time Slots</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define when happy hours are active. Enable/disable and set time periods for special pricing.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>PC</CardTitle>
                  <CardDescription>Configure happy hours time slots and pricing</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="pc-enabled">Enabled</Label>
                  <Switch id="pc-enabled" checked={pcHappyHoursEnabled} onCheckedChange={setPcHappyHoursEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pcTimeSlots.map((slot, index) => (
                <div key={index} className="space-y-2 p-3 rounded-md border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => {
                            const newSlots = [...pcTimeSlots];
                            newSlots[index].startTime = e.target.value;
                            setPcTimeSlots(newSlots);
                          }}
                          data-testid={`input-pc-start-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => {
                            const newSlots = [...pcTimeSlots];
                            newSlots[index].endTime = e.target.value;
                            setPcTimeSlots(newSlots);
                          }}
                          data-testid={`input-pc-end-${index}`}
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removePcTimeSlot(index)}
                      className="mt-5"
                      data-testid={`button-remove-pc-timeslot-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addPcTimeSlot} data-testid="button-add-pc-timeslot">
                + Add Time Slot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>PS5</CardTitle>
                  <CardDescription>Configure happy hours time slots and pricing</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="ps5-enabled">Enabled</Label>
                  <Switch id="ps5-enabled" checked={ps5HappyHoursEnabled} onCheckedChange={setPs5HappyHoursEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ps5TimeSlots.map((slot, index) => (
                <div key={index} className="space-y-2 p-3 rounded-md border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => {
                            const newSlots = [...ps5TimeSlots];
                            newSlots[index].startTime = e.target.value;
                            setPs5TimeSlots(newSlots);
                          }}
                          data-testid={`input-ps5-start-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => {
                            const newSlots = [...ps5TimeSlots];
                            newSlots[index].endTime = e.target.value;
                            setPs5TimeSlots(newSlots);
                          }}
                          data-testid={`input-ps5-end-${index}`}
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removePs5TimeSlot(index)}
                      className="mt-5"
                      data-testid={`button-remove-ps5-timeslot-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addPs5TimeSlot} data-testid="button-add-ps5-timeslot">
                + Add Time Slot
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Happy Hours Pricing</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Set pricing tiers that apply during happy hours time slots. These prices are active only when happy hours are enabled and within the configured time periods.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <HappyHoursPricing category="PC" slots={pcHappyHoursPricing} onUpdateSlots={setPcHappyHoursPricing} />
          <HappyHoursPricing category="PS5" slots={ps5HappyHoursPricing} onUpdateSlots={setPs5HappyHoursPricing} />
        </div>
      </div>
    </div>
  );
}
