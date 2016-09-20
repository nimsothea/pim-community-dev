<?php

namespace Pim\Bundle\DataGridBundle\Normalizer;

use Pim\Bundle\DataGridBundle\Entity\DatagridView;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Structured normalizer for DatagridView
 *
 * @author    Adrien Pétremann <adrien.petremann@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class DatagridViewNormalizer implements NormalizerInterface
{
    /** @var array */
    protected $supportedFormat = ['array'];

    /**
     * {@inheritdoc}
     */
    public function normalize($object, $format = null, array $context = [])
    {
        return [
            'id'             => (int) $object->getId(),
            'owner_id'       => (int) $object->getOwner()->getId(),
            'label'          => (string) $object->getLabel(),
            'type'           => $object->getType(),
            'datagrid_alias' => (string) $object->getDatagridAlias(),
            'columns'        => $object->getColumns(),
            'filters'        => $object->getFilters(),
            'columnsOrder'   => $object->getOrder(),
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function supportsNormalization($data, $format = null)
    {
        return $data instanceof DatagridView && in_array($format, $this->supportedFormat);
    }
}
