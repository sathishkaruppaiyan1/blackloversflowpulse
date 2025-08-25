
import WooCommerceSettings from "@/components/WooCommerceSettings";
import InteraktSettings from "@/components/InteraktSettings";

const SettingsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application settings and integrations
        </p>
      </div>

      <div className="grid gap-6">
        <WooCommerceSettings />
        <InteraktSettings />
      </div>
    </div>
  );
};

export default SettingsPage;
