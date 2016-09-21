<?php

namespace Pim\Bundle\DataGridBundle\Controller\Rest;

use Akeneo\Component\StorageUtils\Saver\SaverInterface;
use Pim\Bundle\DataGridBundle\Entity\DatagridView;
use Pim\Bundle\DataGridBundle\Manager\DatagridViewManager;
use Pim\Bundle\DataGridBundle\Repository\DatagridViewRepositoryInterface;
use Pim\Bundle\EnrichBundle\Exception\DeleteException;
use Pim\Bundle\EnrichBundle\Flash\Message;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Translation\TranslatorInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * REST Controller for Datagrid Views.
 * Handle basic CRUD actions.
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

    /** @var SaverInterface */
    protected $saver;

    /** @var ValidatorInterface */
    protected $validator;

    /** @var TranslatorInterface */
    protected $translator;

    /**
     * @param NormalizerInterface             $normalizer
     * @param DatagridViewRepositoryInterface $datagridViewRepo
     * @param TokenStorageInterface           $tokenStorage
     * @param DatagridViewManager             $datagridViewManager
     * @param SaverInterface                  $saver
     * @param ValidatorInterface              $validator
     * @param TranslatorInterface             $translator
     */
    public function __construct(
        NormalizerInterface $normalizer,
        DatagridViewRepositoryInterface $datagridViewRepo,
        TokenStorageInterface $tokenStorage,
        DatagridViewManager $datagridViewManager,
        SaverInterface $saver,
        ValidatorInterface $validator,
        TranslatorInterface $translator
    ) {
        $this->normalizer = $normalizer;
        $this->datagridViewRepo = $datagridViewRepo;
        $this->tokenStorage = $tokenStorage;
        $this->datagridViewManager = $datagridViewManager;
        $this->saver = $saver;
        $this->validator = $validator;
        $this->translator = $translator;
    }

    /**
     * Return the list of all Datagrid Views that belong to the current user for the given $alias grid.
     * Response data is in Json format and is paginated.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function indexAction(Request $request, $alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();

        $options = $request->query->get('options', ['limit' => 20, 'page' => 1]);
        $term = $request->query->get('search', '');

        $views = $this->datagridViewRepo->findDatagridViewBySearch($user, $alias, $term, $options);
        $normalizedViews = $this->normalizer->normalize($views, 'json');

        return new JsonResponse($normalizedViews);
    }

    /**
     * Return the Datagrid View that belongs to the current user for the given $alias grid
     * and has the given $identifier.
     * Response data is in Json format, 404 is sent if there is no result.
     *
     * @param string $alias
     * @param string $identifier
     *
     * @return JsonResponse
     */
    public function getAction($alias, $identifier)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $this->datagridViewRepo->findOneBy([
            'owner'         => $user,
            'datagridAlias' => $alias,
            'id'            => $identifier
        ]);

        if (null === $view) {
            return new JsonResponse('', 404);
        }

        $normalizedView = $this->normalizer->normalize($view, 'json');

        return new JsonResponse($normalizedView);
    }

    /**
     * Save the Datagrid View received through the $request for the grid with the given $alias.
     *
     * If any errors occur during the writing process, a Json response is sent with {'errors' => 'Error message'}.
     * If success, return a Json response with the id of the saved View.
     *
     * @param Request $request
     * @param string  $alias
     *
     * @return JsonResponse
     */
    public function saveAction(Request $request, $alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $request->request->get('view', null);
        $creation = true;

        if (null === $view) {
            return new JsonResponse();
        }

        if (isset($view['id'])) {
            $creation = false;
            $datagridView = $this->datagridViewRepo->find($view['id']);
        } else {
            $datagridView = new DatagridView();
            $datagridView->setOwner($user);
            $datagridView->setDatagridAlias($alias);
            $datagridView->setLabel($view['label']);
        }

        $datagridView->setColumns(explode(',', $view['columns']));
        $datagridView->setFilters($view['filters']);
        $violations = $this->validator->validate($datagridView);

        if ($violations->count()) {
            $messages = [];
            foreach ($violations as $violation) {
                $messages[] = $this->translator->trans($violation->getMessage());
            }

            return new JsonResponse(['errors' => $messages]);
        } else {
            $this->saver->save($datagridView);

            if ($creation) {
                $request->getSession()->getFlashBag()
                    ->add('success', new Message('grid.view_selector.flash.created'));
            }

            return new JsonResponse(['id' => $datagridView->getId()]);
        }
    }

    /**
     * Remove the Datagrid View with the given $identifier.
     *
     * If any errors occur during the process, a Json response is sent with {'errors' => 'Error message'}.
     * If success, return an empty Json response with code 204 (No content).
     *
     * @param Request $request
     * @param string  $identifier
     *
     * @return JsonResponse
     */
    public function removeAction(Request $request, $identifier)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $this->datagridViewRepo->findOneBy(['owner' => $user, 'id' => $identifier]);

        if ($view === null) {
            return new JsonResponse([
                'error' => $this->translator->trans('grid.view_selector.flash.not_removable')
            ], 404);
        }

        $this->datagridViewManager->remove($view);
        $request->getSession()->getFlashBag()
            ->add('success', new Message('grid.view_selector.flash.removed'));

        return new JsonResponse('', 204);
    }

    /**
     * Return the default columns for the grid with the given $alias.
     * Response data is in Json format.
     *
     * Eg.: ['sku', 'name', 'brand']
     *
     * @param string $alias
     *
     * @return JsonResponse
     */
    public function defaultViewColumnsAction($alias)
    {
        $columns = array_keys($this->datagridViewManager->getColumnChoices($alias, true));

        return new JsonResponse($columns);
    }

    /**
     * Return the current user default Datagrid View object for the grid with the given $alias.
     * Response data is in Json format.
     *
     * @param string $alias
     *
     * @return JsonResponse
     */
    public function getUserDefaultDatagridViewAction($alias)
    {
        $user = $this->tokenStorage->getToken()->getUser();
        $view = $user->getDefaultGridView($alias);

        if (null !== $view) {
            $view = $this->normalizer->normalize($view, 'json');
        }

        return new JsonResponse(['view' => $view]);
    }
}
