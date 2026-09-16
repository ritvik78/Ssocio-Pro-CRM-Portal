import { useEffect, useState } from "react";
import { loadAppData, saveAppData } from "./supabase";

export function useSyncedState(key, fallback, notify) {
  const [items, setItems] = useState(fallback);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await loadAppData(key);
        if (rows && rows.length && active) setItems(rows);
      } catch (error) {
        console.error(`Supabase loading failed for ${key}:`, error.message);
        if (notify && active) {
          notify(`Could not load ${key} from Supabase. Check the Supabase connection.`);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [key, notify]);

  const setAndSave = (updater) => {
    setItems((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveAppData(key, next).catch((error) => {
        console.error(`Supabase sync failed for ${key}:`, error.message);
        if (notify) {
          notify("Could not sync to Supabase. Changes will not appear on other devices.");
        }
      });
      return next;
    });
  };

  return [items, setAndSave];
}