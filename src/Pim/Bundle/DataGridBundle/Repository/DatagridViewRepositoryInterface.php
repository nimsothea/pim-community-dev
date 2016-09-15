<?php

namespace Pim\Bundle\DataGridBundle\Repository;

use Doctrine\Common\Collections\ArrayCollection;
use Pim\Bundle\UserBundle\Entity\UserInterface;

/**
 * Datagrid view repository interface
 *
 * @author    Julien Sanchez <julien@akeneo.com>
 * @copyright 2015 Akeneo SAS (http://www.akeneo.com)
 * @license   http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
interface DatagridViewRepositoryInterface
{
    /**
     * Get all datagrid view type for a given user
     *
     * @param UserInterface $user
     *
     * @return ArrayCollection
     */
    public function getDatagridViewTypeByUser(UserInterface $user);

    /**
     * Get all datagrid views by user and type
     *
     * @param UserInterface $user
     * @param string        $alias
     */
    public function findDatagridViewByUserAndAlias(UserInterface $user, $alias);

    /**
     * Search datagrid views for the given $user and grid $alias.
     * The search is applied with the given $term.
     * You can pass $options to add limit or page informations.
     *
     * @param string        $term
     * @param UserInterface $user
     * @param string        $alias
     * @param array         $options
     *
     * @return ArrayCollection
     */
    public function findDatagridViewBySearch($term, UserInterface $user, $alias, array $options = []);
}
