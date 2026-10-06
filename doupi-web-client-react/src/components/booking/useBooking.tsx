import { useState, useCallback } from "react";
import { BookingModal } from "./BookingModal";

export function useBooking(defaultInitialType = "预约游园 / 访校参观") {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(defaultInitialType);

  const openWithType = useCallback((customType?: string) => {
    if (customType) setType(customType);
    setOpen(true);
  }, []);

  return {
    open: () => setOpen(true),
    openWithType,
    close: () => setOpen(false),
    modal: open ? <BookingModal close={() => setOpen(false)} defaultType={type} /> : null,
  };
}
