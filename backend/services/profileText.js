// services/profileText.js

function buildProfileSummary(profile) {
    if (!profile) {
      return "No onboarding profile found yet.";
    }
  
    const {
      level,
      primaryRole,
      handedness,
      pitchingSchedule,
      priorities,
      gymLevel,
      workoutType,
      trainingDays,
      hasInjury,
      injuryArea,
      injuryRecovery,
    } = profile;
  
    const parts = [];
  
    if (level) parts.push(`Level: ${level}`);
    if (primaryRole) parts.push(`Primary role: ${primaryRole}`);
    if (handedness) parts.push(`Handedness: ${handedness}`);
    if (pitchingSchedule)
      parts.push(`Pitching schedule: ${pitchingSchedule}`);
    if (Array.isArray(priorities) && priorities.length) {
      parts.push(`Priorities: ${priorities.join(", ")}`);
    }
  
    if (gymLevel) parts.push(`Gym level: ${gymLevel}`);
    if (workoutType) parts.push(`Workout type: ${workoutType}`);
    if (trainingDays)
      parts.push(`Training days per week: ${trainingDays}`);
  
    if (hasInjury) {
      parts.push(
        `Recent injury: ${injuryArea || "unspecified area"}, recovery plan: ${
          injuryRecovery || "not specified"
        }`
      );
    } else if (hasInjury === false) {
      parts.push("No current injuries reported.");
    }
  
    return parts.join(" · ");
  }
  
  module.exports = { buildProfileSummary };
  