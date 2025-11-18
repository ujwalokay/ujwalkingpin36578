import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DeviceConfigCard } from "@/components/DeviceConfigCard";
import { PricingTable } from "@/components/PricingTable";
import { HappyHoursPricing } from "@/components/HappyHoursPricing";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { DeviceConfig, PricingConfig, HappyHoursConfig, HappyHoursPricing as HappyHoursPricingType } from "@shared/schema";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

export default function Settings() {
  const { toast } = useToast();
  
  // Fetch device configs
  const { data: deviceConfigs } = useQuery<DeviceConfig[]>({
    queryKey: ['/api/device-config'],
  });

  // Fetch pricing configs
  const { data: pricingConfigs } = useQuery<PricingConfig[]>({
    queryKey: ['/api/pricing-config'],
  });

  // Fetch happy hours configs
  const { data: happyHoursConfigs } = useQuery<HappyHoursConfig[]>({
    queryKey: ['/api/happy-hours-config'],
  });

  // Fetch happy hours pricing
  const { data: happyHoursPricing } = useQuery<HappyHoursPricingType[]>({
    queryKey: ['/api/happy-hours-pricing'],
  });

  // Local state for device configs
  const [pcConfig, setPcConfig] = useState({ count: 30, seats: [] as { name: string; visible: boolean }[] });
  const [ps5Config, setPs5Config] = useState({ count: 20, seats: [] as { name: string; visible: boolean }[] });

  // Local state for pricing
  const [pcPricing, setPcPricing] = useState<{ duration: string; price: number; personCount?: number }[]>([]);
  const [ps5Pricing, setPs5Pricing] = useState<{ duration: string; price: number; personCount?: number }[]>([]);

  // Local state for happy hours time slots
  const [pcHappyHoursEnabled, setPcHappyHoursEnabled] = useState(true);
  const [ps5HappyHoursEnabled, setPs5HappyHoursEnabled] = useState(true);
  const [pcTimeSlots, setPcTimeSlots] = useState<TimeSlot[]>([]);
  const [ps5TimeSlots, setPs5TimeSlots] = useState<TimeSlot[]>([]);

  // Local state for happy hours pricing
  const [pcHappyHoursPricing, setPcHappyHoursPricing] = useState<{ duration: string; price: number; personCount?: number }[]>([]);
  const [ps5HappyHoursPricing, setPs5HappyHoursPricing] = useState<{ duration: string; price: number; personCount?: number }[]>([]);

  // Initialize local state from API data
  useEffect(() => {
    if (deviceConfigs) {
      const pc = deviceConfigs.find((c) => c.category === "PC");
      const ps5 = deviceConfigs.find((c) => c.category === "PS5");

      if (pc) {
        setPcConfig({
          count: pc.count,
          seats: pc.seats.map((name) => ({ name, visible: true })),
        });
      }

      if (ps5) {
        setPs5Config({
          count: ps5.count,
          seats: ps5.seats.map((name) => ({ name, visible: true })),
        });
      }
    }
  }, [deviceConfigs]);

  useEffect(() => {
    if (pricingConfigs) {
      const pcConfigs = pricingConfigs.filter((c) => c.category === "PC");
      const ps5Configs = pricingConfigs.filter((c) => c.category === "PS5");

      setPcPricing(pcConfigs.map((c) => ({ duration: c.duration, price: parseFloat(c.price), personCount: c.personCount })));
      setPs5Pricing(ps5Configs.map((c) => ({ duration: c.duration, price: parseFloat(c.price), personCount: c.personCount })));
    }
  }, [pricingConfigs]);

  useEffect(() => {
    if (happyHoursConfigs) {
      const pcConfigs = happyHoursConfigs.filter((c) => c.category === "PC");
      const ps5Configs = happyHoursConfigs.filter((c) => c.category === "PS5");

      setPcHappyHoursEnabled(pcConfigs.length > 0 && pcConfigs[0].enabled === 1);
      setPs5HappyHoursEnabled(ps5Configs.length > 0 && ps5Configs[0].enabled === 1);

      setPcTimeSlots(pcConfigs.map((c) => ({ startTime: c.startTime, endTime: c.endTime })));
      setPs5TimeSlots(ps5Configs.map((c) => ({ startTime: c.startTime, endTime: c.endTime })));
    }
  }, [happyHoursConfigs]);

  useEffect(() => {
    if (happyHoursPricing) {
      const pcPricing = happyHoursPricing.filter((c) => c.category === "PC");
      const ps5Pricing = happyHoursPricing.filter((c) => c.category === "PS5");

      setPcHappyHoursPricing(pcPricing.map((c) => ({ duration: c.duration, price: parseFloat(c.price), personCount: c.personCount })));
      setPs5HappyHoursPricing(ps5Pricing.map((c) => ({ duration: c.duration, price: parseFloat(c.price), personCount: c.personCount })));
    }
  }, [happyHoursPricing]);

  // Save mutations
  const saveDeviceConfigMutation = useMutation({
    mutationFn: async ({ category, count, seats }: { category: string; count: number; seats: string[] }) => {
      return apiRequest("POST", "/api/device-config", { category, count, seats });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-config'] });
      queryClient.invalidateQueries({ queryKey: ['device-configs'] });
      toast({ title: "Success", description: "Device configuration saved" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save device configuration",
        variant: "destructive" 
      });
    },
  });

  const savePricingMutation = useMutation({
    mutationFn: async ({ category, configs }: { category: string; configs: { duration: string; price: number; personCount?: number }[] }) => {
      return apiRequest("POST", "/api/pricing-config", {
        category,
        configs: configs.map((c) => ({ duration: c.duration, price: c.price.toString(), personCount: c.personCount || 1 })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-config'] });
      toast({ title: "Success", description: "Pricing configuration saved" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save pricing configuration",
        variant: "destructive" 
      });
    },
  });

  const saveHappyHoursConfigMutation = useMutation({
    mutationFn: async ({ category, enabled, timeSlots }: { category: string; enabled: boolean; timeSlots: TimeSlot[] }) => {
      return apiRequest("POST", "/api/happy-hours-config", {
        category,
        configs: timeSlots.map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime, enabled: enabled ? 1 : 0 })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/happy-hours-config'] });
      toast({ title: "Success", description: "Happy hours configuration saved" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save happy hours configuration",
        variant: "destructive" 
      });
    },
  });

  const saveHappyHoursPricingMutation = useMutation({
    mutationFn: async ({ category, configs }: { category: string; configs: { duration: string; price: number; personCount?: number }[] }) => {
      return apiRequest("POST", "/api/happy-hours-pricing", {
        category,
        configs: configs.map((c) => ({ duration: c.duration, price: c.price.toString(), personCount: c.personCount || 1 })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/happy-hours-pricing'] });
      toast({ title: "Success", description: "Happy hours pricing saved" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save happy hours pricing",
        variant: "destructive" 
      });
    },
  });

  const handleSaveAll = async () => {
    try {
      // Save all configurations in parallel
      const savePromises = [
        // Device configs
        apiRequest("POST", "/api/device-config", {
          category: "PC",
          count: pcConfig.count,
          seats: pcConfig.seats.map((s) => s.name),
        }),
        apiRequest("POST", "/api/device-config", {
          category: "PS5",
          count: ps5Config.count,
          seats: ps5Config.seats.map((s) => s.name),
        }),
        // Pricing
        apiRequest("POST", "/api/pricing-config", {
          category: "PC",
          configs: pcPricing.map((c) => ({ duration: c.duration, price: c.price.toString(), personCount: c.personCount || 1 })),
        }),
        apiRequest("POST", "/api/pricing-config", {
          category: "PS5",
          configs: ps5Pricing.map((c) => ({ duration: c.duration, price: c.price.toString(), personCount: c.personCount || 1 })),
        }),
        // Happy hours config
        apiRequest("POST", "/api/happy-hours-config", {
          category: "PC",
          configs: (pcTimeSlots.length > 0 ? pcTimeSlots : [{ startTime: "11:00", endTime: "14:00" }])
            .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime, enabled: pcHappyHoursEnabled ? 1 : 0 })),
        }),
        apiRequest("POST", "/api/happy-hours-config", {
          category: "PS5",
          configs: (ps5TimeSlots.length > 0 ? ps5TimeSlots : [{ startTime: "11:00", endTime: "14:00" }])
            .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime, enabled: ps5HappyHoursEnabled ? 1 : 0 })),
        }),
      ];

      // Add happy hours pricing if exists
      if (pcHappyHoursPricing.length > 0) {
        savePromises.push(
          apiRequest("POST", "/api/happy-hours-pricing", {
            category: "PC",
            configs: pcHappyHoursPricing.map((c) => ({ duration: c.duration, price: c.price.toString(), personCount: c.personCount || 1 })),
          })
        );
      }
      if (ps5HappyHoursPricing.length > 0) {
        savePromises.push(
          apiRequest("POST", "/api/happy-hours-pricing", {
            category: "PS5",
            configs: ps5HappyHoursPricing.map((c) => ({ duration: c.duration, price: c.price.toString(), personCount: c.personCount || 1 })),
          })
        );
      }

      // Wait for all saves to complete
      await Promise.all(savePromises);

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/device-config'] });
      queryClient.invalidateQueries({ queryKey: ['device-configs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/happy-hours-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/happy-hours-pricing'] });

      // Show single success toast
      toast({
        title: "Settings Saved",
        description: "All configurations have been saved successfully!",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save some settings. Please try again.",
        variant: "destructive",
      });
    }
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

      {/* Device Configuration */}
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

      {/* Pricing Configuration */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pricing Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <PricingTable category="PC" slots={pcPricing} onUpdateSlots={setPcPricing} />
          <PricingTable category="PS5" slots={ps5Pricing} onUpdateSlots={setPs5Pricing} />
        </div>
      </div>

      {/* Happy Hours Time Slots */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Happy Hours Time Slots</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define when happy hours are active. Enable/disable and set time periods for special pricing.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
              <div className="flex items-center justify-between">
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

      {/* Happy Hours Pricing */}
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
