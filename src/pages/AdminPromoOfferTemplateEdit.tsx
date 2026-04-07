import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  promoOffersApi,
  PromoOfferTemplateUpdateRequest,
  OFFER_TYPE_CONFIG,
  OfferType,
} from '../api/promoOffers';
import { serversApi } from '../api/servers';
import { AdminBackButton } from '../components/admin';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';

const getOfferTypeIcon = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.icon || '🎁';
};

export default function AdminPromoOfferTemplateEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [validHours, setValidHours] = useState<number | ''>(24);
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0);
  const [activeDiscountHours, setActiveDiscountHours] = useState<number | ''>(0);
  const [testDurationHours, setTestDurationHours] = useState<number | ''>(0);
  const [isActive, setIsActive] = useState(true);
  const [isTestAccess, setIsTestAccess] = useState(false);
  const [selectedSquadUuids, setSelectedSquadUuids] = useState<string[]>([]);

  // Fetch available servers for test_access squad selection
  const { data: serversData } = useQuery({
    queryKey: ['admin-servers-for-promo'],
    queryFn: () => serversApi.getServers(true),
    enabled: isTestAccess,
  });

  // Query template
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['admin-promo-templates'],
    queryFn: promoOffersApi.getTemplates,
  });

  const template = templatesData?.items.find((t) => t.id === Number(id));

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      setName(template.name);
      setMessageText(template.message_text);
      setButtonText(template.button_text);
      setValidHours(template.valid_hours);
      setDiscountPercent(template.discount_percent);
      setActiveDiscountHours(template.active_discount_hours || 0);
      setTestDurationHours(template.test_duration_hours || 0);
      setIsActive(template.is_active);
      setIsTestAccess(template.offer_type === 'test_access');
      setSelectedSquadUuids(template.test_squad_uuids || []);
    }
  }, [template]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: PromoOfferTemplateUpdateRequest) =>
      promoOffersApi.updateTemplate(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-templates'] });
      navigate('/admin/promo-offers');
    },
  });

  const handleSubmit = () => {
    const data: PromoOfferTemplateUpdateRequest = {
      name,
      message_text: messageText,
      button_text: buttonText,
      valid_hours: toNumber(validHours, 1),
      discount_percent: toNumber(discountPercent),
      is_active: isActive,
    };
    const testHours = toNumber(testDurationHours);
    const discountHours = toNumber(activeDiscountHours);
    if (isTestAccess) {
      data.test_duration_hours = testHours > 0 ? testHours : undefined;
      data.test_squad_uuids = selectedSquadUuids;
    } else {
      data.active_discount_hours = discountHours > 0 ? discountHours : undefined;
    }
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/promo-offers" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.promoOffers.form.editTemplate')}
          </h1>
        </div>
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.promoOffers.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/promo-offers" />
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.promoOffers.form.editTemplate')}
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.promoOffers.form.templateName')}
                <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`input ${name.length > 0 && !name.trim() ? 'border-error-500/50' : ''}`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.promoOffers.form.messageText')}
                <span className="text-error-400">*</span>
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className={`input resize-none ${messageText.length > 0 && !messageText.trim() ? 'border-error-500/50' : ''}`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.promoOffers.form.buttonText')}
                <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className={`input ${buttonText.length > 0 && !buttonText.trim() ? 'border-error-500/50' : ''}`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.promoOffers.form.validHours')}
                </label>
                <input
                  type="number"
                  value={validHours}
                  onChange={createNumberInputHandler(setValidHours, 1)}
                  className="input"
                  min={1}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-dark-500">
                  {t('admin.promoOffers.form.activationTime')}
                </p>
              </div>

              {!isTestAccess && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark-300">
                    {t('admin.promoOffers.form.discountPercent')}
                  </label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={createNumberInputHandler(setDiscountPercent, 0, 100)}
                    className="input"
                    min={0}
                    max={100}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {isTestAccess ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark-300">
                    {t('admin.promoOffers.form.testDurationHours')}
                  </label>
                  <input
                    type="number"
                    value={testDurationHours}
                    onChange={createNumberInputHandler(setTestDurationHours, 0)}
                    className="input"
                    min={0}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-dark-500">
                    {t('admin.promoOffers.form.defaultZero')}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark-300">
                    {t('admin.promoOffers.form.testSquads', 'Тестовые серверы')}
                  </label>
                  {serversData?.servers && serversData.servers.length > 0 ? (
                    <div className="space-y-1.5">
                      {serversData.servers.map((server) => (
                        <label
                          key={server.squad_uuid || server.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dark-600 bg-dark-700/50 px-3 py-2 text-sm transition-colors hover:border-accent-500/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSquadUuids.includes(server.squad_uuid)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSquadUuids([...selectedSquadUuids, server.squad_uuid]);
                              } else {
                                setSelectedSquadUuids(
                                  selectedSquadUuids.filter((u) => u !== server.squad_uuid),
                                );
                              }
                            }}
                            className="accent-accent-500"
                          />
                          <span className="text-dark-200">{server.display_name}</span>
                          {server.country_code && (
                            <span className="text-dark-500">{server.country_code}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-dark-500">
                      {t('admin.promoOffers.form.noServers', 'Нет доступных серверов')}
                    </p>
                  )}
                  {selectedSquadUuids.length === 0 && (
                    <p className="mt-1 text-xs text-warning-400">
                      {t(
                        'admin.promoOffers.form.selectSquadHint',
                        'Выберите хотя бы один сервер для тестового доступа',
                      )}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.promoOffers.form.activeDiscountHours')}
                </label>
                <input
                  type="number"
                  value={activeDiscountHours}
                  onChange={createNumberInputHandler(setActiveDiscountHours, 0)}
                  className="input"
                  min={0}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-dark-500">
                  {t('admin.promoOffers.form.discountDurationHint')}
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isActive ? 'bg-accent-500' : 'bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    isActive ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
              <span className="text-sm text-dark-200">
                {t('admin.promoOffers.form.templateActive')}
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={() => navigate('/admin/promo-offers')} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? t('admin.promoOffers.form.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
