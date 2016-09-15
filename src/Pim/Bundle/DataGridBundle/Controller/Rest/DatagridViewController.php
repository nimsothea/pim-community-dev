<?php

namespace Pim\Bundle\DataGridBundle\Controller\Rest;

use Pim\Bundle\DataGridBundle\Repository\DatagridViewRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Datagrid views REST controller
 *
 * @author    Adrien Pétremann <adrien.petremann@akeneo.com>
 * @copyright 2016 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class DatagridViewController
{
    /** @var NormalizerInterface */
    protected $normalizer;

    /** @var DatagridViewRepositoryInterface */
    protected $datagridViewRepo;

    /** @var TokenStorageInterface */
    protected $tokenStorage;

    /**
     * @param NormalizerInterface             $normalizer
     * @param DatagridViewRepositoryInterface $datagridViewRepo
     * @param TokenStorageInterface           $tokenStorage
     */
    public function __construct(
        NormalizerInterface $normalizer,
        DatagridViewRepositoryInterface $datagridViewRepo,
        TokenStorageInterface $tokenStorage
    ) {
        $this->normalizer = $normalizer;
        $this->datagridViewRepo = $datagridViewRepo;
        $this->tokenStorage = $tokenStorage;
    }

    /**
     * Get the datagrid views collection.
     *
     * @param Request $request
     *
     * @return JsonResponse
     */
    public function indexAction(Request $request)
    {
        $user = $this->tokenStorage->getToken()->getUser();

        $options = $request->query->get('options', ['limit' => 20, 'page' => 1, ]);
        $term = $request->query->get('search', '');
        $alias = $request->query->get('gridAlias', 'product-grid');

        // Look for default user view too
        $defaultView = $user->getDefaultGridView($alias);

        $views = $this->datagridViewRepo->findDatagridViewBySearch($term, $user, $alias, $options);

        if (null !== $defaultView) {
            $views->add($defaultView);
        }

        $normalizedViews = $this->normalizer->normalize($views, 'array', []);

        return new JsonResponse($normalizedViews);
    }
}
