const axios = require('axios');

// Simulate a PUT request to update template
async function testUpdate() {
  try {
    // First, get existing templates
    const getResponse = await axios.get('http://localhost:5000/api/editor-templates', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5YjQ5NDYzYS00YjQwLTRjNDAtOThjMi0yNTYxNTAzZjAwZDciLCJpYXQiOjE3MjM1MDU5MTUsImV4cCI6MTcyNDExMDcxNX0.jQXYaHBIvlvI0V5i9dGkV_0kyRLeKcYzKkJVYw0H-Ds',
      }
    });
    
    console.log('✅ Got templates:', getResponse.data.data?.templates?.length || 0);
    
    if (getResponse.data.data?.templates?.length > 0) {
      const template = getResponse.data.data.templates[0];
      console.log('📝 Template to update:', {
        id: template.id,
        name: template.name,
        version: template.version
      });
      
      // Try to update
      const updatePayload = {
        name: template.name + ' (Updated)',
        description: template.description || 'Test update',
        category: template.category,
        elements: template.elements,
        globalStyles: template.globalStyles,
        tags: template.tags,
        isPublic: template.isPublic
      };
      
      console.log('\n📤 Sending PUT request with payload:');
      console.log(JSON.stringify(updatePayload, null, 2).substring(0, 200) + '...');
      
      const updateResponse = await axios.put(
        `http://localhost:5000/api/editor-templates/${template.id}`,
        updatePayload,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5YjQ5NDYzYS00YjQwLTRjNDAtOThjMi0yNTYxNTAzZjAwZDciLCJpYXQiOjE3MjM1MDU5MTUsImV4cCI6MTcyNDExMDcxNX0.jQXYaHBIvlvI0V5i9dGkV_0kyRLeKcYzKkJVYw0H-Ds',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('\n✅ PUT SUCCESS! Status:', updateResponse.status);
      console.log('Response:', JSON.stringify(updateResponse.data, null, 2).substring(0, 300) + '...');
    } else {
      console.log('❌ No templates found to test update');
    }
  } catch (error) {
    console.log('\n❌ ERROR:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }
}

testUpdate();
