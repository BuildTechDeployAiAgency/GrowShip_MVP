import { useState } from "react";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

interface PasswordValidationProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    label: "At least 8 characters long",
    test: (password) => password.length >= 8,
  },
  {
    label: "Contains uppercase and lowercase letters",
    test: (password) => /(?=.*[a-z])(?=.*[A-Z])/.test(password),
  },
  {
    label: "Contains at least one number",
    test: (password) => /(?=.*\d)/.test(password),
  },
  {
    label: "Contains at least one special character (@$!%*?&)",
    test: (password) => /(?=.*[@$!%*?&])/.test(password),
  },
];

export function PasswordValidation({
  password,
  showRequirements = true,
}: PasswordValidationProps) {
  const [showPassword, setShowPassword] = useState(false);

  const validatePassword = (password: string) => {
    return passwordRequirements.map((requirement) => ({
      ...requirement,
      isValid: requirement.test(password),
    }));
  };

  const validationResults = validatePassword(password);
  const isPasswordValid = validationResults.every((result) => result.isValid);

  return (
    <div className="space-y-4">
      {/* Password Requirements */}
      {showRequirements && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">
            Password Requirements:
          </h4>
          <ul className="space-y-2">
            {validationResults.map((requirement, index) => (
              <li key={index} className="flex items-center text-sm">
                {requirement.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                )}
                <span
                  className={
                    requirement.isValid ? "text-green-700" : "text-red-600"
                  }
                >
                  {requirement.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Password Strength Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Password Strength:
          </span>
          <span
            className={`text-sm font-medium ${
              isPasswordValid ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPasswordValid ? "Strong" : "Weak"}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isPasswordValid ? "bg-green-500" : "bg-red-500"
            }`}
            style={{
              width: `${
                (validationResults.filter((r) => r.isValid).length /
                  validationResults.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  showToggle = true,
  className = "",
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showToggle?: boolean;
  className?: string;
  [key: string]: any;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pr-10 ${className}`}
        {...props}
      />
      {showToggle && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </button>
      )}
    </div>
  );
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push(
      "Password must contain at least one special character (@$!%*?&)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
