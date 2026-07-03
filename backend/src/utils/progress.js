// Calcular progresso por seção e geral
function calculateProgress(formData, formSchema) {
  const sectionProgress = {};
  let totalFields = 0;
  let filledFields = 0;
  
  formSchema.sections.forEach(section => {
    const sectionFields = section.fields;
    const sectionFilledFields = sectionFields.filter(field => {
      const value = formData[field.id];
      return value && value.toString().trim().length > 0;
    });
    
    sectionProgress[section.id] = Math.round(
      (sectionFilledFields.length / sectionFields.length) * 100
    );
    
    totalFields += sectionFields.length;
    filledFields += sectionFilledFields.length;
  });
  
  const overallProgress = Math.round((filledFields / totalFields) * 100);
  
  return {
    sections: sectionProgress,
    overall: overallProgress,
    stats: {
      totalFields,
      filledFields
    }
  };
}

module.exports = {
  calculateProgress
};