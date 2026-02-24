import supabase from "./supabase";


export async function fetchDepartments(currentInstituteId, deptQuery, setDeptResults, setLoadingDepts) {
    setLoadingDepts(true);
    const { data, error } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("institute_id", currentInstituteId)
    .ilike("name", `%${deptQuery}%`);

    if (error) {
    console.error("Error fetching departments:", error);
    } else {
    setDeptResults(data);
    }
    setLoadingDepts(false);
};
export async function fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms) {
      setLoadingPrograms(true);
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, departments(name)")
        .eq("institution_id", currentInstituteId)
        .eq("is_active", true)
        .ilike("name", `%${programQuery}%`);

      if (error) {
        console.error("Error fetching programs:", error);
      } else {
        setProgramResults(data);
      }
      setLoadingPrograms(false);
    };

export async function fetchOperations(programId, operationQuery, setOperationResults, setLoadingOperations) {
    setLoadingOperations(true);
    const { data, error } = await supabase
    .from("operations")
    .select("id, name, status, programs(name)")
    .eq("program_id", programId)
    .eq("status", "active")
    .ilike("name", `%${operationQuery}%`);

    if (error) {
    console.error("Error fetching operations:", error);
    } else {
    setOperationResults(data);
    }
    setLoadingOperations(false);
};

export async function fetchSlots(operationId, setSlots) {
    const { data, error } = await supabase
    .from("slotinfo")
    .select("*")
    .eq("operation_id", operationId)
    .order("serial_no");

    if (error) {
        console.error("Error fetching slots:", error);
    } else {
        setSlots(data || []);
    }
};

export async function fetchGroups(
  programId,
  groupQuery,
  setGroupResults,
  setLoadingGroups
) {
  if (!programId) return;

  setLoadingGroups(true);

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, programs(name)")
    .eq("program_id", programId)
    .ilike("name", `%${groupQuery}%`);

  if (error) {
    console.error("Error fetching groups:", error);
  } else {
    setGroupResults(data);
  }

  setLoadingGroups(false);
}

export async function fetchSubgroups(groupId, subgroupQuery, setSubgroupResults, setLoadingSubgroups) {
    setLoadingSubgroups(true);
    const { data, error } = await supabase
    .from("subgroups")
    .select("id, name, groups(name)")
    .eq("group_id", groupId)
    .ilike("name", `%${subgroupQuery}%`);

    if (error) {
        console.error("Error fetching subgroups:", error);
        setLoadingSubgroups(false);
    } else {
        setSubgroupResults(data);
        setLoadingSubgroups(false);
    }
};

export async function fetchRoutinesByProgram( programId, setRoutines, setLoading) {
  if (!programId) return;

  setLoading?.(true);

  const { data, error } = await supabase
  .from("routine")
  .select(`
    id,
    name,
    created_at,
    operation:operation_id!inner (
      id,
      name,
      program_id
    )
  `)
  .eq("operation.program_id", programId)
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching routines:", error);
    setRoutines([]);
  } else {
    setRoutines(data || []);
  }

  setLoading?.(false);
}

export async function fetchRecurringEventsByRoutine(routineId, setEvents, setLoading) {
  if (!routineId) return;

  setLoading?.(true);

  const { data, error } = await supabase
    .from("recurring_events")
    .select(`
      id,
      created_at,
      title,
      type,
      start_at,
      end_at,
      expire_at,
      start_slot,
      end_slot,
      day_of_week,
      repeat_every,
      start_week,
      course_id,
      institute_id,
      created_by,
      description,
      is_reschedulable,
      for_users,
      from_table,
      routine_id
    `)
    .eq("routine_id", routineId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching recurring events:", error);
    setEvents?.([]);
  } else {
    setEvents?.(data || []);
  }

  setLoading?.(false);
}

export async function fetchRecurringEventsByGroup(groupId, setEvents, setLoading) {
  if (!groupId) return;

  setLoading?.(true);

  try {
    const { data: subgroups, error: subgroupsError } = await supabase
      .from("subgroups")
      .select("id")
      .eq("group_id", groupId);

    if (subgroupsError) throw subgroupsError;

    const subgroupIds = subgroups?.map(sg => sg.id) || [];

    const { data: events, error: eventsError } = await supabase
      .from("recurring_events")
      .select("*")
      .or(
        `and(from_table.eq.groups,for_users.eq.${groupId}),and(from_table.eq.subgroups,for_users.in.(${subgroupIds.join(
          ","
        )}))`
      )
      .order("created_at", { ascending: false });

    if (eventsError) throw eventsError;

    setEvents?.(events || []);
  } catch (error) {
    console.error("Error fetching recurring events by group:", error);
    setEvents?.([]);
  } finally {
    setLoading?.(false);
  }
}