// src/modules/register.js
/**
 * Módulo de Registro de Paciente (Autogestión)
 * Permite a un nuevo paciente crear su cuenta y su ficha médica.
 * Con validaciones en tiempo real, campo de nombre de usuario,
 * teléfono de 11 dígitos e inicio de sesión automático al finalizar.
 */

import { Logger } from '../utils/logger.js';

export default function mountRegister(root, { bus, store, onSuccess }) {
  // --- Estado local del módulo ---
  const state = {
    isLoading: false,
    fieldErrors: {
      name: '',
      lastName: '',
      docType: '',
      docNumber: '',
      birthDate: '',
      gender: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      consent: '',
    },
    passwordRequirements: {
      minLength: false,
      hasUpperCase: false,
      hasNumber: false,
      hasSpecialChar: false,
    },
  };

  // --- Función para validar el formato de email ---
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
  };

  // --- Función para validar el formato de teléfono (11 dígitos) ---
  const isValidPhone = (phone) => {
    const re = /^\d{11}$/;
    return re.test(phone);
  };

  // --- Función para validar la contraseña en tiempo real ---
  const checkPasswordStrength = (password) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[@#$%^&*!]/.test(password),
    };
  };

  // --- Función para verificar unicidad de email ---
  const isEmailUnique = (email) => {
    const users = store.get('users');
    return !users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  };

  // --- Función para verificar unicidad de nombre de usuario ---
  const isUsernameUnique = (username) => {
    const users = store.get('users');
    return !users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase());
  };

  // --- Función para verificar unicidad de cédula ---
  const isDocNumberUnique = (docNumber) => {
    const patients = store.get('patients');
    return !patients.some(p => p.dni === docNumber);
  };

  // --- Función para validar un campo específico en tiempo real ---
  const validateField = (fieldName, value, formData = {}) => {
    let error = '';
    
    switch (fieldName) {
      case 'name':
        if (!value.trim()) error = 'El nombre es obligatorio.';
        break;
      case 'lastName':
        if (!value.trim()) error = 'El apellido es obligatorio.';
        break;
      case 'docType':
        if (!value) error = 'Seleccione un tipo de documento.';
        break;
      case 'docNumber':
        if (!value.trim()) error = 'El número de documento es obligatorio.';
        else if (!isDocNumberUnique(value.trim())) error = 'El número de documento ya se encuentra registrado en el sistema.';
        break;
      case 'birthDate':
        if (!value) error = 'La fecha de nacimiento es obligatoria.';
        break;
      case 'gender':
        if (!value) error = 'Seleccione una opción.';
        break;
      case 'phone':
        if (!value.trim()) error = 'El teléfono es obligatorio.';
        else if (!isValidPhone(value.trim())) error = 'Formato inválido (deben ser 11 dígitos).';
        break;
      case 'email':
        if (!value.trim()) error = 'El correo electrónico es obligatorio.';
        else if (!isValidEmail(value.trim())) error = 'El formato del correo electrónico no es válido.';
        else if (!isEmailUnique(value.trim())) error = 'El correo electrónico ya está registrado. ¿Olvidaste tu contraseña?';
        break;
      case 'username':
        if (!value.trim()) error = 'El nombre de usuario es obligatorio.';
        else if (value.trim().length < 3) error = 'El nombre de usuario debe tener al menos 3 caracteres.';
        else if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) error = 'Solo letras, números y guión bajo.';
        else if (!isUsernameUnique(value.trim())) error = 'El nombre de usuario ya está en uso. Por favor, elija otro.';
        break;
      case 'password':
        if (!value) error = 'La contraseña es obligatoria.';
        else {
          const req = checkPasswordStrength(value);
          if (!(req.minLength && req.hasUpperCase && req.hasNumber && req.hasSpecialChar)) {
            error = 'La contraseña debe cumplir con los requisitos de seguridad.';
          }
        }
        break;
      case 'confirmPassword':
        if (!value) error = 'Confirme su contraseña.';
        else if (formData.password !== value) error = 'Las contraseñas ingresadas no coinciden.';
        break;
      case 'consent':
        if (!value) error = 'Debes aceptar el consentimiento informado para continuar.';
        break;
    }
    
    return error;
  };

  // --- Función para actualizar la UI de requisitos de contraseña ---
  const updatePasswordUI = (password) => {
    const req = checkPasswordStrength(password);
    const reqElements = {
      minLength: document.getElementById('req-minlength'),
      hasUpperCase: document.getElementById('req-uppercase'),
      hasNumber: document.getElementById('req-number'),
      hasSpecialChar: document.getElementById('req-special'),
    };

    Object.keys(req).forEach(key => {
      if (reqElements[key]) {
        if (req[key]) {
          reqElements[key].innerHTML = '✓';
          reqElements[key].style.color = 'var(--success)';
        } else {
          reqElements[key].innerHTML = '✗';
          reqElements[key].style.color = 'var(--danger)';
        }
      }
    });
  };

  // --- Función para mostrar mensaje de error en campo específico ---
  const showFieldError = (fieldId, errorMsg) => {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const container = field.closest('.form-group');
    if (!container) return;
    
    let errorDiv = container.querySelector('.error-msg');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-msg';
      errorDiv.style.cssText = 'color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;';
      container.appendChild(errorDiv);
    }
    errorDiv.textContent = errorMsg;
  };

  // --- Función para limpiar error de campo ---
  const clearFieldError = (fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const container = field.closest('.form-group');
    if (!container) return;
    
    const errorDiv = container.querySelector('.error-msg');
    if (errorDiv) {
      errorDiv.textContent = '';
    }
  };

  // --- Función para guardar el registro y autenticar automáticamente ---
  const registerPatient = async (formData) => {
    state.isLoading = true;
    const saveBtn = document.getElementById('register-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span> Registrando...';
    }

    try {
      // 1. Crear el registro del paciente
      const newPatient = await store.add('patients', {
        name: `${formData.name.trim()} ${formData.lastName.trim()}`,
        docType: formData.docType,
        dni: formData.docNumber.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender === 'Femenino' ? 'F' : formData.gender === 'Masculino' ? 'M' : 'O',
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        isActive: true,
        allergies: [],
        consent: {
          granted: true,
          date: Date.now(),
          scope: 'Tratamiento de datos personales y sensibles según normativa vigente',
        },
        createdAt: Date.now(),
      });

      // 2. Crear el usuario asociado con el nombre de usuario proporcionado
      const newUser = await store.add('users', {
        username: formData.username.trim(),
        password: formData.password,
        name: `${formData.name.trim()} ${formData.lastName.trim()}`,
        role: 'patient',
        email: formData.email.trim(),
        patientId: newPatient.id,
        isActive: true,
      });

      // 3. Log de auditoría
      Logger.log(store, { id: 'system', name: 'Sistema' }, {
        action: Logger.Actions.CREATE,
        module: Logger.Modules.PATIENTS,
        description: `Paciente registrado por autogestión: ${formData.email.trim()} (usuario: ${formData.username.trim()})`,
        details: { patientId: newPatient.id, username: formData.username.trim() },
      });

      // 4. Mostrar mensaje de éxito
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success';
      successMessage.innerHTML = '✓ ¡Registro exitoso! Iniciando sesión automáticamente...';
      successMessage.style.cssText = 'margin-bottom: 1rem; text-align: center; padding: 0.75rem; border-radius: 8px; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;';
      const formContainer = root.querySelector('#register-form-container');
      const existingMsg = formContainer.querySelector('.alert');
      if (existingMsg) existingMsg.remove();
      formContainer.insertBefore(successMessage, formContainer.firstChild);

      // 5. Iniciar sesión automáticamente (guardar usuario en localStorage)
      setTimeout(() => {
        localStorage.setItem('hospital_user', JSON.stringify(newUser));
        localStorage.setItem('hospital_landing_seen', 'true');
        
        // Llamar a onSuccess con el usuario para iniciar sesión automática
        if (onSuccess) onSuccess(newUser);
      }, 2000);
      
    } catch (error) {
      console.error('Error en el registro:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'alert alert-danger';
      errorMsg.innerHTML = '❌ Ocurrió un error al crear la cuenta. Por favor, intente de nuevo.';
      errorMsg.style.cssText = 'margin-bottom: 1rem; text-align: center; padding: 0.75rem; border-radius: 8px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
      const formContainer = root.querySelector('#register-form-container');
      const existingMsg = formContainer.querySelector('.alert');
      if (existingMsg) existingMsg.remove();
      formContainer.insertBefore(errorMsg, formContainer.firstChild);
    } finally {
      state.isLoading = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Registrarse';
      }
    }
  };

  // --- Función para validar todos los campos del formulario ---
  const validateAllFields = (formData) => {
    let isValid = true;
    const fieldsToValidate = ['name', 'lastName', 'docType', 'docNumber', 'birthDate', 'gender', 'phone', 'email', 'username', 'password', 'confirmPassword', 'consent'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field], formData);
      if (error) {
        showFieldError(`reg-${field}`, error);
        isValid = false;
      } else {
        clearFieldError(`reg-${field}`);
      }
    });
    
    return isValid;
  };

  // --- Renderizado del formulario de registro ---
  function render() {
    root.innerHTML = `
      <div class="register-page" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%); padding: 2rem;">
        <div class="register-card" style="max-width: 750px; width: 100%; background: white; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: loginFadeIn 0.5s ease-out;">
          <div class="register-header" style="background: linear-gradient(135deg, var(--themeDarker) 0%, var(--themePrimary) 100%); padding: 1.5rem; text-align: center;">
            <h2 style="margin: 0; color: white; font-size: 1.5rem;">Registro de Nuevo Paciente</h2>
            <p style="margin: 0.5rem 0 0; color: rgba(255,255,255,0.9);">Complete los datos para crear su cuenta</p>
          </div>
          <div id="register-form-container" style="padding: 2rem;">
            <form id="register-form">
              <!-- Sección 1: Datos Personales -->
              <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.85rem; margin-bottom: 1rem; color: var(--themeDark); border-left: 3px solid var(--themePrimary); padding-left: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Datos Personales</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Nombres completos *</label>
                    <input type="text" class="input" id="reg-name" placeholder="Ej: María José" autocomplete="off">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Apellidos completos *</label>
                    <input type="text" class="input" id="reg-lastname" placeholder="Ej: Pérez González" autocomplete="off">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 1rem; margin-top: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Tipo Documento *</label>
                    <select class="input" id="reg-doctype">
                      <option value="">Seleccionar</option>
                      <option value="V">Cédula (V)</option>
                      <option value="E">Cédula (E)</option>
                      <option value="P">Pasaporte</option>
                    </select>
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Número de documento *</label>
                    <input type="text" class="input" id="reg-docnumber" placeholder="Ej: 12345678" autocomplete="off">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Fecha de nacimiento *</label>
                    <input type="date" class="input" id="reg-birthdate" max="${new Date().toISOString().split('T')[0]}">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Sexo *</label>
                    <select class="input" id="reg-gender">
                      <option value="">Seleccionar</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                </div>
              </div>

              <!-- Sección 2: Datos de Contacto y Acceso -->
              <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.85rem; margin-bottom: 1rem; color: var(--themeDark); border-left: 3px solid var(--themePrimary); padding-left: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Contacto y Acceso</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Teléfono móvil *</label>
                    <input type="tel" class="input" id="reg-phone" placeholder="Ej: 04121234567 (11 dígitos)" autocomplete="off">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                    <div style="font-size: 0.65rem; color: #64748b; margin-top: 0.25rem;">Ingrese 11 dígitos (ej: 04121234567)</div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Correo electrónico *</label>
                    <input type="email" class="input" id="reg-email" placeholder="Ej: usuario@ejemplo.com" autocomplete="off">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Nombre de usuario *</label>
                    <input type="text" class="input" id="reg-username" placeholder="Ej: mariaperez (solo letras, números y _)" autocomplete="off">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                    <div style="font-size: 0.65rem; color: #64748b; margin-top: 0.25rem;">Mínimo 3 caracteres, solo letras, números y guión bajo</div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Contraseña *</label>
                    <input type="password" class="input" id="reg-password" placeholder="Mínimo 8 caracteres">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                    <div id="password-requirements" style="font-size: 0.7rem; margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                      <div><span id="req-minlength">✗</span> 8+ caracteres</div>
                      <div><span id="req-uppercase">✗</span> Mayúscula</div>
                      <div><span id="req-number">✗</span> Número</div>
                      <div><span id="req-special">✗</span> Especial (@#$%^&*!)</div>
                    </div>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                  <div class="form-group">
                    <label class="form-label" style="font-weight: 600;">Confirmar contraseña *</label>
                    <input type="password" class="input" id="reg-confirmpassword" placeholder="Repita la contraseña">
                    <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
                  </div>
                  <div></div>
                </div>
              </div>

              <!-- Sección 3: Consentimiento Informado -->
              <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.85rem; margin-bottom: 1rem; color: var(--themeDark); border-left: 3px solid var(--themePrimary); padding-left: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Aspectos Legales</h3>
                <div style="border: 1px solid var(--border); border-radius: 12px; margin-bottom: 1rem; overflow: hidden;">
                  <div style="background: #f8fafc; padding: 0.75rem 1rem; font-weight: 700; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Consentimiento Informado y Términos de Uso</div>
                  <div style="padding: 1rem; max-height: 180px; overflow-y: auto; font-size: 0.8rem; line-height: 1.5;">
                    <p><strong>Al aceptar, usted autoriza al Hospital Universitario Manuel Núñez Tovar a:</strong></p>
                    <ul style="margin: 0.5rem 0; padding-left: 1.25rem;">
                      <li>Registrar y almacenar sus datos personales y clínicos en nuestro sistema de gestión.</li>
                      <li>Utilizar su información para la programación de citas, atención médica y seguimiento clínico.</li>
                      <li>Compartir su información con el personal médico y administrativo autorizado para su atención.</li>
                    </ul>
                    <p><strong>Términos y Condiciones de Uso:</strong> El acceso y uso del sistema está sujeto a las políticas de privacidad y seguridad del hospital. Usted se compromete a proporcionar información veraz y actualizada.</p>
                    <p>Para más información, consulte nuestras políticas completas en recepción.</p>
                  </div>
                </div>
                <div class="form-group" style="display: flex; align-items: center; gap: 0.75rem;">
                  <input type="checkbox" id="reg-consent" style="width: 18px; height: 18px;">
                  <label for="reg-consent" style="margin: 0; font-size: 0.85rem;">He leído y acepto el consentimiento informado y los términos y condiciones.</label>
                </div>
                <div class="error-msg" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.25rem;"></div>
              </div>

              <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                <button type="button" class="btn btn-outline" id="cancel-register" style="padding: 0.6rem 1.5rem;">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="register-btn" style="padding: 0.6rem 1.8rem; font-weight: 700;">Registrarse</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <style>
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input:focus {
          border-color: var(--themePrimary);
          box-shadow: 0 0 0 3px rgba(0, 120, 180, 0.1);
          outline: none;
        }
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.6s linear infinite;
          margin-right: 6px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    setupEvents();
  }

  // --- Configuración de eventos y validaciones en tiempo real ---
  function setupEvents() {
    const form = document.getElementById('register-form');
    const cancelBtn = document.getElementById('cancel-register');
    
    // Obtener referencias a los campos
    const fields = {
      name: document.getElementById('reg-name'),
      lastName: document.getElementById('reg-lastname'),
      docType: document.getElementById('reg-doctype'),
      docNumber: document.getElementById('reg-docnumber'),
      birthDate: document.getElementById('reg-birthdate'),
      gender: document.getElementById('reg-gender'),
      phone: document.getElementById('reg-phone'),
      email: document.getElementById('reg-email'),
      username: document.getElementById('reg-username'),
      password: document.getElementById('reg-password'),
      confirmPassword: document.getElementById('reg-confirmpassword'),
      consent: document.getElementById('reg-consent'),
    };

    // Función para obtener todos los valores del formulario
    const getFormData = () => ({
      name: fields.name?.value || '',
      lastName: fields.lastName?.value || '',
      docType: fields.docType?.value || '',
      docNumber: fields.docNumber?.value || '',
      birthDate: fields.birthDate?.value || '',
      gender: fields.gender?.value || '',
      phone: fields.phone?.value || '',
      email: fields.email?.value || '',
      username: fields.username?.value || '',
      password: fields.password?.value || '',
      confirmPassword: fields.confirmPassword?.value || '',
      consent: fields.consent?.checked || false,
    });

    // Configurar validación en tiempo real para cada campo
    const setupFieldValidation = (fieldId, fieldName) => {
      const field = document.getElementById(fieldId);
      if (!field) return;
      
      const validate = () => {
        const formData = getFormData();
        const error = validateField(fieldName, field.value, formData);
        showFieldError(fieldId, error);
      };
      
      field.addEventListener('input', validate);
      field.addEventListener('change', validate);
      field.addEventListener('blur', validate);
    };

    // Configurar validación para todos los campos
    setupFieldValidation('reg-name', 'name');
    setupFieldValidation('reg-lastname', 'lastName');
    setupFieldValidation('reg-doctype', 'docType');
    setupFieldValidation('reg-docnumber', 'docNumber');
    setupFieldValidation('reg-birthdate', 'birthDate');
    setupFieldValidation('reg-gender', 'gender');
    setupFieldValidation('reg-phone', 'phone');
    setupFieldValidation('reg-email', 'email');
    setupFieldValidation('reg-username', 'username');
    setupFieldValidation('reg-password', 'password');
    setupFieldValidation('reg-confirmpassword', 'confirmPassword');
    
    // Validación específica para contraseña (actualizar UI de requisitos)
    if (fields.password) {
      fields.password.addEventListener('input', () => {
        updatePasswordUI(fields.password.value);
        const formData = getFormData();
        const error = validateField('password', fields.password.value, formData);
        showFieldError('reg-password', error);
      });
    }
    
    // Validación para confirmación de contraseña (también en tiempo real)
    if (fields.confirmPassword) {
      fields.confirmPassword.addEventListener('input', () => {
        const formData = getFormData();
        const error = validateField('confirmPassword', fields.confirmPassword.value, formData);
        showFieldError('reg-confirmpassword', error);
      });
    }
    
    // Validación para consentimiento
    if (fields.consent) {
      fields.consent.addEventListener('change', () => {
        const error = validateField('consent', fields.consent.checked);
        showFieldError('reg-consent', error);
      });
    }

    // Envío del formulario
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = getFormData();
      
      if (validateAllFields(formData)) {
        await registerPatient(formData);
      } else {
        // Mostrar un mensaje general si hay errores
        const errorMsg = document.createElement('div');
        errorMsg.className = 'alert alert-danger';
        errorMsg.innerHTML = '⚠️ Por favor, corrija los errores marcados en el formulario.';
        errorMsg.style.cssText = 'margin-bottom: 1rem; text-align: center; padding: 0.75rem; border-radius: 8px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;';
        const formContainer = document.getElementById('register-form-container');
        const existingMsg = formContainer.querySelector('.alert');
        if (existingMsg) existingMsg.remove();
        formContainer.insertBefore(errorMsg, formContainer.firstChild);
        setTimeout(() => errorMsg.remove(), 4000);
        
        // Hacer scroll al primer error
        const firstError = formContainer.querySelector('.error-msg:not(:empty)');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    cancelBtn.addEventListener('click', () => {
      // Redirigir al login
      if (onSuccess) onSuccess(null);
    });
  }

  render();

  return {
    destroy() {
      root.innerHTML = '';
    },
  };
}