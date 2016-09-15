<?php

namespace Pim\Bundle\DataGridBundle\Controller\Rest;

use Pim\Bundle\DataGridBundle\Manager\DatagridViewManager;
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

    /** @var DatagridViewManager */
    protected $datagridViewManager;

    /**
     * @param NormalizerInterface             $normalizer
     * @param DatagridViewRepositoryInterface $datagridViewRepo
     * @param TokenStorageInterface           $tokenStorage
     * @param DatagridViewManager             $datagridViewManager
     */
    public function __construct(
        NormalizerInterface $normalizer,
        DatagridViewRepositoryInterface $datagridViewRepo,
        TokenStorageInterface $tokenStorage,
        DatagridViewManager $datagridViewManager
    ) {
        $this->normalizer = $normalizer;
        $this->datagridViewRepo = $datagridViewRepo;
        $this->tokenStorage = $tokenStorage;
        $this->datagridViewManager = $datagridViewManager;
    }

    /**
     * Get the datagrid views collection.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function indexAction(Request $request, $alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();

        $options = $request->query->get('options', ['limit' => 20, 'page' => 1, ]);
        $term = $request->query->get('search', '');

        $views = $this->datagridViewRepo->findDatagridViewBySearch($term, $user, $alias, $options);
        $normalizedViews = $this->normalizer->normalize($views, 'array', []);

        return new JsonResponse($normalizedViews);
    }

    /**
     * Get the datagrid view by its $id.
     *
     * @param Request $request
     * @param string  $alias
     * @param string  $identifier
     *
     * @return JsonResponse
     */
    public function getAction(Request $request, $alias, $identifier)
    {
        $user = $this->tokenStorage->getToken()->getUser();

        $view = $this->datagridViewRepo->findOneBy(['owner' => $user, 'datagridAlias' => $alias, 'id' => $identifier]);
        $normalizedView = $this->normalizer->normalize($view, 'array', []);

        return new JsonResponse($normalizedView);
    }

    /**
     * Get the default view columns for a grid.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function defaultViewColumnsAction(Request $request, $alias)
    {
        $columns = array_keys($this->datagridViewManager->getColumnChoices($alias, true));

        return new JsonResponse($columns);
    }

    /**
     * Get the default datagrid view for current user.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function getUserDefaultDatagridView(Request $request, $alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $user->getDefaultGridView($alias);

        if (null !== $view) {
            $view = $this->normalizer->normalize($view, 'array', []);
        }

        return new JsonResponse(['view' => $view]);
    }
}
