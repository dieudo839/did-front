import { forwardRef, useEffect, useId, useState, type FocusEventHandler } from 'react';

interface CountryCode {
  name: string;
  dialCode: string;
}

const defaultCountry: CountryCode = { name: 'Burkina Faso', dialCode: '+226' };

const countryCodes: CountryCode[] = [
  { name: 'Afrique du Sud', dialCode: '+27' },
  { name: 'Arabie saoudite', dialCode: '+966' },
  { name: 'Algérie', dialCode: '+213' },
  { name: 'Angola', dialCode: '+244' },
  { name: 'Allemagne', dialCode: '+49' },
  { name: 'Australie', dialCode: '+61' },
  { name: 'Belgique', dialCode: '+32' },
  { name: 'Bénin', dialCode: '+229' },
  { name: 'Botswana', dialCode: '+267' },
  { name: 'Brésil', dialCode: '+55' },
  defaultCountry,
  { name: 'Cameroun', dialCode: '+237' },
  { name: 'Canada', dialCode: '+1' },
  { name: 'Chine', dialCode: '+86' },
  { name: 'Chypre', dialCode: '+357' },
  { name: 'Comores', dialCode: '+269' },
  { name: 'Congo', dialCode: '+242' },
  { name: 'République démocratique du Congo', dialCode: '+243' },
  { name: 'Égypte', dialCode: '+20' },
  { name: 'Côte d’Ivoire', dialCode: '+225' },
  { name: 'Espagne', dialCode: '+34' },
  { name: 'États-Unis', dialCode: '+1' },
  { name: 'Éthiopie', dialCode: '+251' },
  { name: 'France', dialCode: '+33' },
  { name: 'Gambie', dialCode: '+220' },
  { name: 'Ghana', dialCode: '+233' },
  { name: 'Guinée équatoriale', dialCode: '+240' },
  { name: 'Guinée-Bissau', dialCode: '+245' },
  { name: 'Guinée', dialCode: '+224' },
  { name: 'Inde', dialCode: '+91' },
  { name: 'Italie', dialCode: '+39' },
  { name: 'Japon', dialCode: '+81' },
  { name: 'Kenya', dialCode: '+254' },
  { name: 'Libéria', dialCode: '+231' },
  { name: 'Mali', dialCode: '+223' },
  { name: 'Maroc', dialCode: '+212' },
  { name: 'Mauritanie', dialCode: '+222' },
  { name: 'Niger', dialCode: '+227' },
  { name: 'Nigeria', dialCode: '+234' },
  { name: 'Pays-Bas', dialCode: '+31' },
  { name: 'Portugal', dialCode: '+351' },
  { name: 'Qatar', dialCode: '+974' },
  { name: 'République centrafricaine', dialCode: '+236' },
  { name: 'Royaume-Uni', dialCode: '+44' },
  { name: 'Rwanda', dialCode: '+250' },
  { name: 'Sénégal', dialCode: '+221' },
  { name: 'Seychelles', dialCode: '+248' },
  { name: 'Sierra Leone', dialCode: '+232' },
  { name: 'Singapour', dialCode: '+65' },
  { name: 'Soudan', dialCode: '+249' },
  { name: 'Sri Lanka', dialCode: '+94' },
  { name: 'Suède', dialCode: '+46' },
  { name: 'Tanzanie', dialCode: '+255' },
  { name: 'Togo', dialCode: '+228' },
  { name: 'Tunisie', dialCode: '+216' },
  { name: 'Turquie', dialCode: '+90' },
  { name: 'Ouganda', dialCode: '+256' },
  { name: 'Émirats arabes unis', dialCode: '+971' },
  { name: 'Zimbabwe', dialCode: '+263' },
];
const countryCodesByLongestDialCode = [...countryCodes].sort(
  (first, second) => second.dialCode.length - first.dialCode.length,
);

interface PhoneFieldProps {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}

function parsePhone(value: string): { country: CountryCode; nationalNumber: string } {
  if (!value.startsWith('+')) {
    return { country: defaultCountry, nationalNumber: value.replace(/\D/g, '') };
  }

  const country = countryCodesByLongestDialCode.find((option) => value.startsWith(option.dialCode));

  if (!country) {
    return { country: defaultCountry, nationalNumber: value.replace(/\D/g, '') };
  }

  return {
    country,
    nationalNumber: value.slice(country.dialCode.length).replace(/\D/g, ''),
  };
}

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  { label, name, value, error, onChange, onBlur },
  ref,
) {
  const generatedId = useId();
  const countryListId = `${generatedId}-countries`;
  const countryInputId = `${generatedId}-country`;
  const phoneInputId = `${generatedId}-number`;
  const errorId = `${generatedId}-error`;
  const helpId = `${generatedId}-help`;
  const [country, setCountry] = useState(() => parsePhone(value).country);
  const [countrySearch, setCountrySearch] = useState<string | null>(null);
  const nationalNumber = parsePhone(value).nationalNumber;

  useEffect(() => {
    if (value) {
      const parsedCountry = parsePhone(value).country;
      setCountry((current) =>
        current.dialCode === parsedCountry.dialCode ? current : parsedCountry,
      );
    }
  }, [value]);

  function chooseCountry(searchValue: string) {
    const normalized = searchValue.trim().toLocaleLowerCase('fr-FR');
    return countryCodes.find(
      (option) => `${option.name} (${option.dialCode})`.toLocaleLowerCase('fr-FR') === normalized,
    );
  }

  return (
    <div className="field-wrap phone-field-wrap">
      <span className="phone-field-label">{label}</span>
      <div className="phone-field-controls">
        <label className="field" htmlFor={countryInputId}>
          <span>Pays ou indicatif</span>
          <input
            id={countryInputId}
            list={countryListId}
            autoComplete="off"
            value={countrySearch ?? `${country.name} (${country.dialCode})`}
            onFocus={() => setCountrySearch('')}
            onBlur={() => setCountrySearch(null)}
            onChange={(event) => {
              const searchValue = event.target.value;
              setCountrySearch(searchValue);
              const selected = chooseCountry(searchValue);
              if (selected) {
                setCountry(selected);
                setCountrySearch(null);
                onChange(nationalNumber ? `${selected.dialCode}${nationalNumber}` : '');
              }
            }}
          />
          <datalist id={countryListId}>
            {countryCodes.map((option) => (
              <option
                key={`${option.name}-${option.dialCode}`}
                value={`${option.name} (${option.dialCode})`}
              />
            ))}
          </datalist>
        </label>
        <label className="field" htmlFor={phoneInputId}>
          <span>Numéro</span>
          <input
            ref={ref}
            id={phoneInputId}
            name={name}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="Numéro sans indicatif"
            value={nationalNumber}
            aria-invalid={Boolean(error)}
            aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
            onBlur={onBlur}
            onChange={(event) => {
              const enteredValue = event.target.value.trim();
              const pastedCountry = enteredValue.startsWith('+')
                ? countryCodesByLongestDialCode.find((option) =>
                    enteredValue.startsWith(option.dialCode),
                  )
                : undefined;

              if (pastedCountry) {
                const digits = enteredValue.slice(pastedCountry.dialCode.length).replace(/\D/g, '');
                setCountry(pastedCountry);
                onChange(digits ? `${pastedCountry.dialCode}${digits}` : '');
                return;
              }

              const digits = enteredValue.replace(/\D/g, '');
              onChange(digits ? `${country.dialCode}${digits}` : '');
            }}
          />
        </label>
      </div>
      <span className="field-help" id={helpId}>
        Enregistré avec l’indicatif {country.dialCode}.
      </span>
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
