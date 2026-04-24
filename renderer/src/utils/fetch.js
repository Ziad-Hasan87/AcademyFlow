import supabase from "./supabase";

export async function fetchProgramChatId(programId) {
  if (!programId) return null;

  const { data, error } = await supabase
    .from("programs")
    .select("chat_id")
    .eq("id", programId)
    .single();

  if (error) {
    console.error("Error fetching program chat_id:", error);
    return null;
  }

  return data?.chat_id || null;
}

export async function fetchBotId(instituteId) {
  if (!instituteId) return null;

  const { data, error } = await supabase
    .from("institutes")
    .select("botid")
    .eq("id", instituteId)
    .single();

  if (error) {
    console.error("Error fetching institute botid:", error);
    return null;
  }

  return data?.botid || null;
}

export async function resolveProgramIdFromEventTarget(fromTable, forUsers) {
  if (!fromTable || !forUsers) return null;

  if (fromTable === "programs") {
    return forUsers;
  }

  if (fromTable === "operations") {
    const { data, error } = await supabase
      .from("operations")
      .select("program_id")
      .eq("id", forUsers)
      .single();

    if (error) {
      console.error("Error resolving program_id from operation:", error);
      return null;
    }

    return data?.program_id || null;
  }

  if (fromTable === "groups") {
    const { data, error } = await supabase
      .from("groups")
      .select("program_id")
      .eq("id", forUsers)
      .single();

    if (error) {
      console.error("Error resolving program_id from group:", error);
      return null;
    }

    return data?.program_id || null;
  }

  if (fromTable === "subgroups") {
    const { data: subgroupData, error: subgroupError } = await supabase
      .from("subgroups")
      .select("group_id")
      .eq("id", forUsers)
      .single();

    if (subgroupError) {
      console.error("Error resolving group_id from subgroup:", subgroupError);
      return null;
    }

    if (!subgroupData?.group_id) return null;

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("program_id")
      .eq("id", subgroupData.group_id)
      .single();

    if (groupError) {
      console.error("Error resolving program_id from subgroup's group:", groupError);
      return null;
    }

    return groupData?.program_id || null;
  }

  return null;
}

export async function resolveSlotTimesFromIds(startSlotId, endSlotId) {
  const slotIds = [startSlotId, endSlotId].filter(Boolean);

  if (slotIds.length === 0) {
    return { start_time: null, end_time: null };
  }

  const { data, error } = await supabase
    .from("slotinfo")
    .select("id, start, end")
    .in("id", slotIds);

  if (error) {
    console.error("Error resolving slot times:", error);
    return { start_time: null, end_time: null };
  }

  const byId = Object.fromEntries((data || []).map((slot) => [slot.id, slot]));

  return {
    start_time: byId[startSlotId]?.start || null,
    end_time: byId[endSlotId]?.end || null,
  };
}

export async function fetchProgramName(programId) {
  if (!programId) return null;

  const { data, error } = await supabase
    .from("programs")
    .select("name")
    .eq("id", programId)
    .single();

  if (error) {
    console.error("Error fetching program name:", error);
    return null;
  }

  return data?.name || null;
}

export async function resolveEventTargetLabel(fromTable, forUsers) {
  if (!fromTable || !forUsers) return null;

  if (fromTable === "programs") {
    return fetchProgramName(forUsers);
  }

  if (fromTable === "operations") {
    const { data, error } = await supabase
      .from("operations")
      .select("name")
      .eq("id", forUsers)
      .single();

    if (error) {
      console.error("Error resolving operation label:", error);
      return null;
    }

    return data?.name || null;
  }

  if (fromTable === "groups") {
    const { data, error } = await supabase
      .from("groups")
      .select("name")
      .eq("id", forUsers)
      .single();

    if (error) {
      console.error("Error resolving group label:", error);
      return null;
    }

    return data?.name || null;
  }

  if (fromTable === "subgroups") {
    const { data, error } = await supabase
      .from("subgroups")
      .select("name")
      .eq("id", forUsers)
      .single();

    if (error) {
      console.error("Error resolving subgroup label:", error);
      return null;
    }

    return data?.name || null;
  }

  return null;
}

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
  .select("id, name, is_active, chat_id, departments(name)")
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

export async function fetchSlots(instituteId, setSlots) {
    if (!instituteId || instituteId === 'null' || instituteId === 'undefined') {
        setSlots([]);
        return;
    }
    const { data, error } = await supabase
    .from("slotinfo")
    .select("*")
    .eq("institute_id", instituteId)
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
    if (!groupId || groupId === 'null' || groupId === 'undefined') {
        setSubgroupResults([]);
        setLoadingSubgroups(false);
        return;
    }

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

export async function fetchCoursesByOperation(operationId, setCourses, setLoading) {
  if (!operationId) {
    setCourses([]);
    setLoading?.(false);
    return;
  }

  setLoading?.(true);

  const { data, error } = await supabase
    .from("courses")
    .select("id, name")
    .eq("operation_id", operationId)
    .order("name");

  if (error) {
    console.error("Error fetching courses:", error);
    setCourses([]);
  } else {
    setCourses(data || []);
  }

  setLoading?.(false);
}

export async function fetchCourseModerators(courseId, setModerators, setLoading) {
  if (!courseId) {
    setModerators([]);
    setLoading?.(false);
    return;
  }

  setLoading?.(true);

  const { data, error } = await supabase
    .from("course_moderators")
    .select("course_id, user_id, users(id, name, role)")
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching course moderators:", error);
    setModerators([]);
  } else {
    setModerators(data || []);
  }

  setLoading?.(false);
}

export async function fetchTeachersByInstitute(instituteId, searchQuery, setResults, setLoading) {
  if (!instituteId) return;

  setLoading?.(true);

  const { data, error } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("institute_id", instituteId)
    .eq("role", "Teacher")
    .ilike("name", `%${searchQuery}%`);

  if (error) {
    console.error("Error fetching teachers:", error);
    setResults([]);
  } else {
    setResults(data || []);
  }

  setLoading?.(false);
}

export async function fetchInstituteDetails(instituteId) {
  if (!instituteId) return null;

  const { data, error } = await supabase
    .from("institutes")
    .select("id, name, code, timezone, is_active, botid, image_path")
    .eq("id", instituteId)
    .single();

  if (error) {
    console.error("Error fetching institute details:", error);
    return null;
  }

  return data || null;
}

export async function fetchOperationsByInstitute(instituteId, setOperations, setLoading) {
  if (!instituteId) {
    setOperations?.([]);
    setLoading?.(false);
    return;
  }

  setLoading?.(true);

  const { data, error } = await supabase
    .from("operations")
    .select("id, name, status, created_at, program:programs!inner(name, institution_id)")
    .eq("program.institution_id", instituteId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching operations by institute:", error);
    setOperations?.([]);
  } else {
    setOperations?.(data || []);
  }

  setLoading?.(false);
}