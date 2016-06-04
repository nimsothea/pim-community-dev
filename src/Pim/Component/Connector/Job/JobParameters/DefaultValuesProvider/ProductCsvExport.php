<?php

namespace Pim\Component\Connector\Job\JobParameters\DefaultValuesProvider;

use Akeneo\Component\Batch\Job\JobInterface;
use Akeneo\Component\Batch\Job\JobParameters\DefaultValuesProviderInterface;
use Akeneo\Component\Localization\Localizer\LocalizerInterface;

/**
 * DefaultParameters for product CSV export
 *
 * @author    Nicolas Dupont <nicolas@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
class ProductCsvExport implements DefaultValuesProviderInterface
{
    /** @var DefaultValuesProviderInterface */
    protected $simpleProvider;

    /** @var array */
    protected $supportedJobNames;

    /**
     * @param DefaultValuesProviderInterface $simpleProvider
     * @param array                      $supportedJobNames
     */
    public function __construct(DefaultValuesProviderInterface $simpleProvider, array $supportedJobNames)
    {
        $this->simpleProvider = $simpleProvider;
        $this->supportedJobNames = $supportedJobNames;
    }

    /**
     * {@inheritdoc}
     */
    public function getDefaultValues()
    {
        $parameters = $this->simpleProvider->getDefaultValues();
        $parameters['decimalSeparator'] = LocalizerInterface::DEFAULT_DECIMAL_SEPARATOR;
        $parameters['dateFormat'] = LocalizerInterface::DEFAULT_DATE_FORMAT;
        // $parameters['channel'] = 'mobile';//null;
        // $parameters['locales'] = ['fr_FR'];
        $parameters['filters'] = '{"data": [], "structure": {}}';
        // $parameters['enabled'] = true;

        // $constraintFields['enabled'] = new NotBlank(['groups' => 'Execution']);
        // $constraintFields['updated'] = new NotBlank(['groups' => 'Execution']);
        // $constraintFields['locales'] = new NotBlank([
        //     'groups'  => 'Execution',
        //     'message' => 'pim_connector.export.locales.validation.not_blank'
        // ]);
        // $constraintFields['families'] = [];
        // $constraintFields['completeness'] = [
        //     new NotBlank(['groups' => 'Execution']),
        //     new Choice(['choices' => [
        //         'at_least_one_complete',
        //         'all_complete',
        //         'all_incomplete',
        //         'all',
        //     ], 'groups' => 'Execution'])
        // ];

        return $parameters;
    }

    /**
     * {@inheritdoc}
     */
    public function supports(JobInterface $job)
    {
        return in_array($job->getName(), $this->supportedJobNames);
    }
}