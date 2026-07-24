-- Enforces one active Fleet vehicle assignment per Traccar device.
ALTER TABLE fm_vehicle_device
    ADD UNIQUE KEY uk_vehicle_device_tc_device (tc_device_id);
