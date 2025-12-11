// MyDatePicker.js
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export default function MyDatePicker({ value, onChange }) {
    return (
      <div>
        <DayPicker
          mode="single"
          selected={value}
          onSelect={onChange}
        />
        <p>
          {value
            ? `Selected: ${value.toLocaleDateString()}`
            : "Pick a day."}
        </p>
      </div>
    );
  }
  
